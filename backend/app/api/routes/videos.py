import json
import re
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, HTTPException

from app.core.config import DATA_FILE
from app.schemas.video import Video

router = APIRouter(prefix="/api/videos", tags=["videos"])

_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,20}$")


def _extract_youtube_video_id(url: str) -> str | None:
    try:
        parsed = urlparse(url)
    except Exception:
        return None

    host = (parsed.netloc or "").lower()
    host = host.split(":")[0]
    path_parts = [part for part in (parsed.path or "").split("/") if part]

    # youtu.be/<id>
    if host in {"youtu.be", "www.youtu.be"} and path_parts:
        candidate = path_parts[0]
        return candidate if _VIDEO_ID_RE.fullmatch(candidate) else None

    # youtube.com/watch?v=<id>
    if host.endswith("youtube.com"):
        query_video_ids = parse_qs(parsed.query).get("v", [])
        if query_video_ids:
            candidate = query_video_ids[0]
            return candidate if _VIDEO_ID_RE.fullmatch(candidate) else None

        # youtube.com/embed/<id> or youtube.com/shorts/<id>
        if len(path_parts) >= 2 and path_parts[0] in {"embed", "shorts", "live"}:
            candidate = path_parts[1]
            return candidate if _VIDEO_ID_RE.fullmatch(candidate) else None

    return None


def _normalize_embed_url(url: str) -> str:
    if not url:
        return url

    video_id = _extract_youtube_video_id(url)
    if not video_id:
        return url

    return f"https://www.youtube.com/embed/{video_id}"


def _load_videos() -> list[Video]:
    if not DATA_FILE.exists():
        return []

    with DATA_FILE.open("r", encoding="utf-8-sig") as fp:
        payload = json.load(fp)

    normalized_items: list[dict] = []
    for item in payload:
        row = dict(item)
        row["embedUrl"] = _normalize_embed_url(str(row.get("embedUrl", "")))
        normalized_items.append(row)

    return [Video(**item) for item in normalized_items]


@router.get("", response_model=list[Video])
def list_videos() -> list[Video]:
    return _load_videos()


@router.get("/{video_id}", response_model=Video)
def get_video(video_id: str) -> Video:
    videos = _load_videos()
    for video in videos:
        if video.id == video_id:
            return video

    raise HTTPException(status_code=404, detail="Video not found")
