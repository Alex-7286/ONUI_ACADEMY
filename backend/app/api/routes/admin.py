import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_conn
from app.core.jwt_token import create_access_token, decode_access_token
from app.schemas.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    TeacherApplicationOut,
    TeacherApprovalRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer(auto_error=False)


def _require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 인증이 필요합니다.",
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 관리자 토큰입니다.",
        )

    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 없습니다.",
        )

    return payload


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(body: AdminLoginRequest) -> AdminLoginResponse:
    configured_id = os.getenv("ADMIN_LOGIN_ID", "admin")
    configured_password = os.getenv("ADMIN_LOGIN_PASSWORD", "1111")

    valid_id = secrets.compare_digest(body.admin_id, configured_id)
    valid_password = secrets.compare_digest(body.password, configured_password)
    if not valid_id or not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    access_token, expires_in = create_access_token(
        user_id=0,
        email=configured_id,
        role="admin",
    )
    return AdminLoginResponse(
        access_token=access_token,
        expires_in=expires_in,
    )


@router.get("/teachers", response_model=list[TeacherApplicationOut])
def list_teacher_applications(
    _: dict = Depends(_require_admin),
) -> list[TeacherApplicationOut]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, email, name, approval_status, created_at
            FROM users
            WHERE role = 'teacher'
            ORDER BY
                CASE approval_status
                    WHEN 'pending' THEN 0
                    WHEN 'approved' THEN 1
                    ELSE 2
                END,
                id DESC
            """
        ).fetchall()

    return [TeacherApplicationOut(**dict(row)) for row in rows]


@router.patch("/teachers/{user_id}", response_model=TeacherApplicationOut)
def review_teacher_application(
    user_id: int,
    body: TeacherApprovalRequest,
    _: dict = Depends(_require_admin),
) -> TeacherApplicationOut:
    next_status = "approved" if body.action == "approve" else "rejected"

    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE id = ? AND role = 'teacher'",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="선생님 신청 정보를 찾을 수 없습니다.")

        conn.execute(
            "UPDATE users SET approval_status = ? WHERE id = ?",
            (next_status, user_id),
        )
        updated = conn.execute(
            """
            SELECT id, email, name, approval_status, created_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
        conn.commit()

    return TeacherApplicationOut(**dict(updated))
