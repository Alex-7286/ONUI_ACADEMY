import sqlite3
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_conn
from app.core.jwt_token import create_access_token, decode_access_token
from app.core.secure import hash_password, verify_password
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    PasswordChangeRequest,
    PasswordChangeResponse,
    SignupRequest,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)
PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s])\S{8,16}$")


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


def _get_current_user_id(token: str) -> int:
    try:
        payload = decode_access_token(token)
        return int(payload.get("sub", "0"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest) -> UserOut:
    email = _normalize_email(body.email)
    if "@" not in email:
        raise HTTPException(status_code=400, detail="유효한 이메일 형식이 아닙니다.")

    try:
        with get_conn() as conn:
            approval_status = "pending" if body.role == "teacher" else "approved"
            cur = conn.execute(
                """
                INSERT INTO users (email, password_hash, name, role, approval_status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    email,
                    hash_password(body.password),
                    body.name.strip(),
                    body.role,
                    approval_status,
                ),
            )
            user_id = cur.lastrowid
            row = conn.execute(
                """
                SELECT id, email, name, role, approval_status, created_at, last_login_at
                FROM users
                WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
            conn.commit()

    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")

    return UserOut(**dict(row))


@router.patch("/password", response_model=PasswordChangeResponse)
def change_password(
    body: PasswordChangeRequest,
    token: str = Depends(_require_bearer_token),
) -> PasswordChangeResponse:
    if not PASSWORD_PATTERN.fullmatch(body.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="새 비밀번호는 8~16자 영문, 숫자, 특수문자를 모두 포함해야 합니다.",
        )

    user_id = _get_current_user_id(token)

    with get_conn() as conn:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
        if not verify_password(body.current_password, row["password_hash"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="현재 비밀번호가 올바르지 않습니다.")
        if verify_password(body.new_password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="현재 비밀번호와 다른 비밀번호를 입력해 주세요.",
            )

        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(body.new_password), user_id),
        )
        conn.commit()

    return PasswordChangeResponse(message="비밀번호가 변경되었습니다.")


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> LoginResponse:
    email = _normalize_email(body.email)

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, email, name, role, approval_status, password_hash,
                   created_at, last_login_at
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

        if row["role"] != body.role:
            raise HTTPException(
                status_code=403,
                detail="선택한 로그인 유형과 계정 권한이 일치하지 않습니다.",
            )

        if row["role"] == "teacher" and row["approval_status"] != "approved":
            detail = (
                "관리자 승인 대기 중입니다."
                if row["approval_status"] == "pending"
                else "선생님 가입 신청이 반려되었습니다."
            )
            raise HTTPException(status_code=403, detail=detail)

        last_login_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (last_login_at, row["id"]))
        if row["role"] == "student":
            conn.execute(
                """
                INSERT OR IGNORE INTO attendance_logs (student_id, attended_on)
                VALUES (?, date('now'))
                """,
                (row["id"],),
            )
        conn.commit()

    access_token, expires_in = create_access_token(
        user_id=row["id"],
        email=row["email"],
        role=row["role"],
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserOut(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            role=row["role"],
            approval_status=row["approval_status"],
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
            """
            SELECT id, email, name, role, approval_status, created_at, last_login_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return UserOut(**dict(row))
