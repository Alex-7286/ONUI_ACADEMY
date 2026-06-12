from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
import uuid
import wave
from datetime import datetime
from pathlib import Path
from typing import Any

ENGINE_URL = os.getenv("SPEECHPRO_ENGINE_URL", "http://112.220.79.218:33005/speechpro").rstrip("/")
SPEECHPRO_SCORE_PATH = os.getenv("SPEECHPRO_SCORE_PATH", "scorefile").strip().strip("/") or "scorefile"
SPEECHPRO_TIMEOUT_GTP = float(os.getenv("SPEECHPRO_TIMEOUT_GTP", "15") or "15")
SPEECHPRO_TIMEOUT_MODEL = float(os.getenv("SPEECHPRO_TIMEOUT_MODEL", "15") or "15")
SPEECHPRO_TIMEOUT_SCORE = float(os.getenv("SPEECHPRO_TIMEOUT_SCORE", "25") or "25")


def normalize_spaces(text: str) -> str:
    text = re.sub(r"[\u00A0\u2002\u2003\u2009\t\r\n]+", " ", text or "")
    return text.strip()


def wav_duration_seconds(path: str) -> float:
    try:
        with wave.open(path, "rb") as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate() or 1
            return frames / float(rate)
    except Exception:
        return 0.0


def _get_any(data: dict[str, Any], *keys: str, default: Any = None) -> Any:
    if not isinstance(data, dict):
        return default
    for key in keys:
        value = data.get(key)
        if value is not None:
            return value
    return default


def _engine_error_code(payload: dict[str, Any]) -> int:
    try:
        return int(_get_any(payload, "error code", "error_code", "errorCode", default=0) or 0)
    except Exception:
        return 0


def _is_decode_failure(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    if _engine_error_code(payload) == 2604:
        return True
    message = str(_get_any(payload, "result", "message", "error", default="") or "")
    return "Did not successfully decode" in message


def _post_json(url: str, payload: dict[str, Any], timeout: float) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Connection": "close"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _multipart_body(fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]) -> tuple[bytes, str]:
    boundary = f"----onui-speechpro-{uuid.uuid4().hex}"
    chunks: list[bytes] = []

    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n'.encode(),
                b"Content-Type: application/json; charset=utf-8\r\n\r\n" if name == "config" else b"\r\n",
                value.encode("utf-8"),
                b"\r\n",
            ]
        )

    for name, (filename, content, content_type) in files.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode(),
                f"Content-Type: {content_type}\r\n\r\n".encode(),
                content,
                b"\r\n",
            ]
        )

    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), boundary


def _post_multipart(url: str, fields: dict[str, str], files: dict[str, tuple[str, bytes, str]], timeout: float) -> dict[str, Any]:
    body, boundary = _multipart_body(fields, files)
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
            "Connection": "close",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        response_body = response.read().decode("utf-8").strip()
        if not response_body:
            return {"success": False, "error": "SpeechPro 응답이 비어 있습니다."}
        parsed = json.loads(response_body)
        if isinstance(parsed, dict) and isinstance(parsed.get("result"), str):
            try:
                parsed = json.loads(parsed["result"])
            except Exception:
                pass
        return parsed


def call_speechpro_evaluation_scorejson(text: str, wav_path: str) -> dict[str, Any]:
    clean_text = normalize_spaces(text)
    if not clean_text:
        return {"success": False, "error": "텍스트가 비어 있습니다."}
    if not Path(wav_path).exists():
        return {"success": False, "error": "WAV 파일을 찾을 수 없습니다."}

    request_id = "req_" + datetime.now().strftime("%H%M%S_%f")

    try:
        gtp = _post_json(f"{ENGINE_URL}/gtp", {"id": request_id, "text": clean_text}, SPEECHPRO_TIMEOUT_GTP)
        if _engine_error_code(gtp) != 0:
            return {"success": False, "error": f"GTP 실패: {gtp}"}

        syll_ltrs = _get_any(gtp, "syll ltrs", "syll_ltrs")
        syll_phns = _get_any(gtp, "syll phns", "syll_phns")
        if not syll_ltrs or not syll_phns:
            return {"success": False, "error": "GTP 응답에 음절 정보가 없습니다."}

        model = _post_json(
            f"{ENGINE_URL}/model",
            {"id": request_id, "text": clean_text, "syll_ltrs": syll_ltrs, "syll_phns": syll_phns},
            SPEECHPRO_TIMEOUT_MODEL,
        )
        if _engine_error_code(model) != 0:
            return {"success": False, "error": f"MODEL 실패: {model}"}

        fst = _get_any(model, "fst")
        if not fst:
            return {"success": False, "error": "MODEL 응답에 fst가 없습니다."}

        config_payload = {
            "id": request_id,
            "text": clean_text,
            "syll_ltrs": _get_any(model, "syll ltrs", "syll_ltrs") or syll_ltrs,
            "syll_phns": _get_any(model, "syll phns", "syll_phns") or syll_phns,
            "fst": fst,
        }
        wav_bytes = Path(wav_path).read_bytes()
        content_type = "audio/wav"
        score_data = _post_multipart(
            f"{ENGINE_URL}/{SPEECHPRO_SCORE_PATH}",
            {"config": json.dumps(config_payload, ensure_ascii=False)},
            {"wav_usr": (Path(wav_path).name, wav_bytes, content_type)},
            SPEECHPRO_TIMEOUT_SCORE,
        )

        if _is_decode_failure(score_data):
            return {"success": False, "error": "음성이 짧거나 무음입니다. 다시 시도해주세요."}
        if _engine_error_code(score_data) != 0:
            return {"success": False, "error": f"SCOREFILE 실패: {score_data}"}

        return {"success": True, "score_result": score_data}
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore").strip()
        if "empty input" in body or "Did not successfully decode" in body:
            return {"success": False, "error": "문장에 비해 음성이 너무 짧습니다."}
        return {"success": False, "error": f"SpeechPro HTTP {error.code}: {body[:500]}"}
    except Exception as error:
        return {"success": False, "error": f"SpeechPro 통신 장애: {error}"}


def _extract_score(raw: dict[str, Any]) -> float:
    data: Any = raw.get("result") if isinstance(raw.get("result"), dict) else raw
    if not isinstance(data, dict):
        return 0.0

    try:
        if data.get("score") is not None:
            return float(data["score"])
        quality = data.get("quality")
        if isinstance(quality, dict):
            if quality.get("score") is not None:
                return float(quality["score"])
            for sentence in quality.get("sentences") or []:
                if isinstance(sentence, dict) and sentence.get("text") != "!SIL" and sentence.get("score") is not None:
                    return float(sentence["score"])
    except Exception:
        return 0.0

    return 0.0


def evaluate_pronunciation(text: str, wav_path: Path) -> tuple[float, dict[str, Any]]:
    duration = wav_duration_seconds(str(wav_path))
    if duration < 1.0:
        return 0.0, {"error": f"녹음이 너무 짧아 분석할 수 없습니다. 1초 이상 말해 주세요. (현재 {duration:.2f}초)"}

    result = call_speechpro_evaluation_scorejson(text, str(wav_path))
    if not result.get("success"):
        return 0.0, {"error": result.get("error", "SpeechPro 엔진 호출 실패")}

    raw = result.get("score_result", {}) or {}
    return _extract_score(raw), raw
