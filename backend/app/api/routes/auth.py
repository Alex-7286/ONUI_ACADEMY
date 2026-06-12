import sqlite3
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_conn
from app.core.jwt_token import create_access_token, decode_access_token
from app.core.secure import hash_password, verify_password
from app.schemas.auth import LoginRequest, LoginResponse, SignupRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _require_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 필요합니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest) -> UserOut:
    email = _normalize_email(body.email)
    if "@" not in email:
        raise HTTPException(status_code=400, detail="유효한 이메일 형식이 아닙니다.")

    try:
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
                (email, hash_password(body.password), body.name.strip()),
            )
            user_id = cur.lastrowid
            row = conn.execute(
                "SELECT id, email, name, created_at, last_login_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            conn.commit()

    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")

    return UserOut(**dict(row))


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    email = _normalize_email(body.email)

    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, name, password_hash, created_at, last_login_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()

        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

        last_login_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (last_login_at, row["id"]))
        conn.commit()

    access_token, expires_in = create_access_token(user_id=row["id"], email=row["email"])

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserOut(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            created_at=row["created_at"],
            last_login_at=last_login_at,
        ),
    )


@router.get("/me", response_model=UserOut)
def me(token: str = Depends(_require_bearer_token)) -> UserOut:
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub", "0"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, name, created_at, last_login_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return UserOut(**dict(row))
