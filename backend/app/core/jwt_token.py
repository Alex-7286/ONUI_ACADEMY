import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "120"))
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * ((4 - len(raw) % 4) % 4)
    return base64.urlsafe_b64decode((raw + padding).encode("ascii"))


def _sign(data: bytes) -> str:
    digest = hmac.new(JWT_SECRET_KEY.encode("utf-8"), data, hashlib.sha256).digest()
    return _b64url_encode(digest)


def create_access_token(
    *,
    user_id: int,
    email: str,
    role: str,
    expires_minutes: int | None = None,
) -> tuple[str, int]:
    now = int(time.time())
    ttl_minutes = expires_minutes if expires_minutes is not None else JWT_EXPIRE_MINUTES
    exp = now + (ttl_minutes * 60)

    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": now,
        "exp": exp,
    }

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature_b64 = _sign(signing_input)

    token = f"{header_b64}.{payload_b64}.{signature_b64}"
    return token, ttl_minutes * 60


def decode_access_token(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format")

    header_b64, payload_b64, signature_b64 = parts

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_sig = _sign(signing_input)
    if not hmac.compare_digest(signature_b64, expected_sig):
        raise ValueError("Invalid token signature")

    payload_bytes = _b64url_decode(payload_b64)
    payload = json.loads(payload_bytes.decode("utf-8"))

    exp = payload.get("exp")
    if not isinstance(exp, int):
        raise ValueError("Invalid token expiration")

    if int(time.time()) >= exp:
        raise ValueError("Token expired")

    return payload
