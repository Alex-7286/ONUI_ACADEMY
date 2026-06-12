import base64
import os
import re
import subprocess
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.speechpro_client import evaluate_pronunciation

router = APIRouter(prefix="/speech", tags=["speech"])

BACKEND_DIR = Path(__file__).resolve().parents[3]
TMP_DIR = BACKEND_DIR / "data" / "tmp" / "speech"
_DEFAULT_FFMPEG_BIN = r"C:\ffmpeg\bin\ffmpeg.exe"
FFMPEG_BIN = os.getenv("FFMPEG_BIN", _DEFAULT_FFMPEG_BIN if Path(_DEFAULT_FFMPEG_BIN).exists() else "ffmpeg")
SPEECH_SCORE_BONUS = float(os.getenv("SPEECH_SCORE_BONUS", "3.5") or "3.5")


class SpeechEvaluateRequest(BaseModel):
    text: str
    audio_base64: str
    mime_type: str | None = None
    filename: str | None = None
    level: str | None = None
    topic: str | None = None


def _clean_text(text: str) -> str:
    cleaned = re.sub(r"[.?!,]", " ", text or "")
    return " ".join(cleaned.split()).strip()


def _extension(filename: str | None, mime_type: str | None) -> str:
    name_ext = Path(filename or "").suffix.lower()
    if name_ext:
        return name_ext
    if mime_type and "wav" in mime_type:
        return ".wav"
    if mime_type and "mp4" in mime_type:
        return ".mp4"
    if mime_type and "ogg" in mime_type:
        return ".ogg"
    return ".webm"


def _write_audio(payload: SpeechEvaluateRequest) -> Path:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    audio_text = payload.audio_base64.split(",", 1)[-1]
    audio_bytes = base64.b64decode(audio_text)
    input_path = TMP_DIR / f"up_{uuid.uuid4().hex}{_extension(payload.filename, payload.mime_type)}"
    input_path.write_bytes(audio_bytes)
    return input_path


def _convert_to_wav(input_path: Path) -> Path | None:
    output_path = input_path.with_suffix(".wav")
    command = [
        FFMPEG_BIN,
        "-y",
        "-i",
        str(input_path),
        "-ar",
        "16000",
        "-ac",
        "1",
        "-acodec",
        "pcm_s16le",
        "-f",
        "wav",
        str(output_path),
    ]
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return output_path
    except Exception:
        return None


def _display_score(raw_score: float | None) -> float | None:
    if raw_score is None:
        return None
    return round(min(100.0, max(0.0, raw_score) + SPEECH_SCORE_BONUS), 1)


def _extract_recognized_text(result: Any) -> str:
    if not isinstance(result, dict):
        return ""
    data = result.get("result") if isinstance(result.get("result"), dict) else result
    if not isinstance(data, dict):
        return ""
    quality = data.get("quality")
    if isinstance(quality, dict):
        for sentence in quality.get("sentences") or []:
            if isinstance(sentence, dict):
                text = str(sentence.get("text") or "").strip()
                if text and text != "!SIL":
                    return text
    return ""


@router.post("/evaluate")
def evaluate_speech(payload: SpeechEvaluateRequest) -> dict[str, Any]:
    clean_text = _clean_text(payload.text)
    if not clean_text:
        return {"success": False, "error": "평가할 문장이 없습니다."}
    if not payload.audio_base64:
        return {"success": False, "error": "녹음 데이터가 없습니다."}

    input_path: Path | None = None
    wav_path: Path | None = None

    try:
        input_path = _write_audio(payload)
        wav_path = _convert_to_wav(input_path)
        if wav_path is None:
            return {"success": False, "error": "오디오 변환에 실패했습니다. ffmpeg 설정을 확인해주세요."}

        raw_score, full_result = evaluate_pronunciation(clean_text, wav_path)
        if not full_result or (isinstance(full_result, dict) and full_result.get("error")):
            return {"success": False, "error": full_result.get("error", "발음 평가 응답이 없습니다.")}

        score = _display_score(float(raw_score))
        return {
            "success": True,
            "score": score,
            "raw_score": raw_score,
            "result": full_result,
            "recognized_text": _extract_recognized_text(full_result),
        }
    except Exception as error:
        return {"success": False, "error": f"서버 내부 오류: {error}"}
    finally:
        for path in (input_path, wav_path):
            try:
                if path and path.exists():
                    path.unlink()
            except Exception:
                pass
