import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = BACKEND_ROOT / "data" / "videos.json"


def get_allowed_origins() -> list[str]:
    raw = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def get_allowed_origin_regex() -> str:
    # Allow ngrok frontend domains by default for demo/dev environments.
    return os.getenv("FRONTEND_ORIGIN_REGEX", r"^https://.*\.ngrok-free\.dev$")
