import random
import sqlite3
import string
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_conn
from app.core.jwt_token import decode_access_token
from app.schemas.classes import (
    ClassCreateRequest,
    ClassOut,
    ClassStudentOut,
    InvitePreviewOut,
    JoinClassRequest,
    JoinedClassOut,
)

router = APIRouter(prefix="/classes", tags=["classes"])
security = HTTPBearer(auto_error=False)


def _require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요합니다.",
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub", "0"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다.",
        )

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, email, name, role, approval_status
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    return dict(row)


def _require_teacher(current_user: dict[str, Any] = Depends(_require_user)) -> dict[str, Any]:
    if current_user["role"] != "teacher" or current_user["approval_status"] != "approved":
        raise HTTPException(status_code=403, detail="승인된 선생님 계정이 필요합니다.")
    return current_user


def _require_student(current_user: dict[str, Any] = Depends(_require_user)) -> dict[str, Any]:
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="학생 계정으로 로그인해주세요.")
    return current_user


def _normalize_invite_code(invite_code: str) -> str:
    return invite_code.strip().upper()


def _make_invite_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(8))


def _create_unique_invite_code(conn) -> str:
    for _ in range(30):
        invite_code = _make_invite_code()
        exists = conn.execute(
            "SELECT 1 FROM classes WHERE invite_code = ?",
            (invite_code,),
        ).fetchone()
        if not exists:
            return invite_code
    raise HTTPException(status_code=500, detail="초대코드를 생성하지 못했습니다.")


def _class_row_to_out(row) -> ClassOut:
    return ClassOut(
        id=row["id"],
        name=row["name"],
        teacher_id=row["teacher_id"],
        teacher_name=row["teacher_name"],
        invite_code=row["invite_code"],
        student_count=row["student_count"],
        created_at=row["created_at"],
    )


def _ensure_teacher_class(conn, class_id: int, teacher_id: int) -> None:
    row = conn.execute(
        "SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
        (class_id, teacher_id),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="반 정보를 찾을 수 없습니다.")


@router.get("/teacher", response_model=list[ClassOut])
def list_teacher_classes(
    current_user: dict[str, Any] = Depends(_require_teacher),
) -> list[ClassOut]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT
                c.id,
                c.name,
                c.teacher_id,
                u.name AS teacher_name,
                c.invite_code,
                c.created_at,
                COUNT(cs.id) AS student_count
            FROM classes c
            JOIN users u ON u.id = c.teacher_id
            LEFT JOIN class_students cs ON cs.class_id = c.id
            WHERE c.teacher_id = ?
            GROUP BY c.id
            ORDER BY c.id DESC
            """,
            (current_user["id"],),
        ).fetchall()

    return [_class_row_to_out(row) for row in rows]


@router.post("/teacher", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_teacher_class(
    body: ClassCreateRequest,
    current_user: dict[str, Any] = Depends(_require_teacher),
) -> ClassOut:
    class_name = body.name.strip()

    with get_conn() as conn:
        class_id = None
        for _ in range(5):
            invite_code = _create_unique_invite_code(conn)
            try:
                cur = conn.execute(
                    """
                    INSERT INTO classes (teacher_id, name, invite_code)
                    VALUES (?, ?, ?)
                    """,
                    (current_user["id"], class_name, invite_code),
                )
                class_id = cur.lastrowid
                break
            except sqlite3.IntegrityError as exc:
                if "invite_code" not in str(exc):
                    raise

        if class_id is None:
            raise HTTPException(status_code=500, detail="초대코드를 생성하지 못했습니다.")

        class_id = cur.lastrowid
        row = conn.execute(
            """
            SELECT
                c.id,
                c.name,
                c.teacher_id,
                u.name AS teacher_name,
                c.invite_code,
                c.created_at,
                0 AS student_count
            FROM classes c
            JOIN users u ON u.id = c.teacher_id
            WHERE c.id = ?
            """,
            (class_id,),
        ).fetchone()
        conn.commit()

    return _class_row_to_out(row)


@router.delete("/teacher/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher_class(
    class_id: int,
    current_user: dict[str, Any] = Depends(_require_teacher),
) -> None:
    with get_conn() as conn:
        _ensure_teacher_class(conn, class_id, current_user["id"])
        conn.execute("DELETE FROM class_students WHERE class_id = ?", (class_id,))
        conn.execute("DELETE FROM classes WHERE id = ? AND teacher_id = ?", (class_id, current_user["id"]))
        conn.commit()

    return None


@router.get("/teacher/{class_id}/students", response_model=list[ClassStudentOut])
def list_class_students(
    class_id: int,
    current_user: dict[str, Any] = Depends(_require_teacher),
) -> list[ClassStudentOut]:
    with get_conn() as conn:
        _ensure_teacher_class(conn, class_id, current_user["id"])
        rows = conn.execute(
            """
            SELECT
                u.id,
                u.name,
                u.email,
                cs.joined_at
            FROM class_students cs
            JOIN users u ON u.id = cs.student_id
            WHERE cs.class_id = ?
            ORDER BY cs.id DESC
            """,
            (class_id,),
        ).fetchall()

    return [ClassStudentOut(**dict(row)) for row in rows]


@router.delete("/teacher/{class_id}/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_class_student(
    class_id: int,
    student_id: int,
    current_user: dict[str, Any] = Depends(_require_teacher),
) -> None:
    with get_conn() as conn:
        _ensure_teacher_class(conn, class_id, current_user["id"])
        row = conn.execute(
            """
            SELECT id
            FROM class_students
            WHERE class_id = ? AND student_id = ?
            """,
            (class_id, student_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="연결된 학생을 찾을 수 없습니다.")

        conn.execute(
            "DELETE FROM class_students WHERE class_id = ? AND student_id = ?",
            (class_id, student_id),
        )
        conn.commit()

    return None


@router.get("/invite/{invite_code}", response_model=InvitePreviewOut)
def get_invite_preview(invite_code: str) -> InvitePreviewOut:
    normalized_code = _normalize_invite_code(invite_code)

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT
                c.id AS class_id,
                c.name AS class_name,
                u.name AS teacher_name,
                c.invite_code
            FROM classes c
            JOIN users u ON u.id = c.teacher_id
            WHERE c.invite_code = ?
            """,
            (normalized_code,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="초대 링크를 찾을 수 없습니다.")

    return InvitePreviewOut(**dict(row))


@router.post("/join", response_model=JoinedClassOut)
def join_class(
    body: JoinClassRequest,
    current_user: dict[str, Any] = Depends(_require_student),
) -> JoinedClassOut:
    normalized_code = _normalize_invite_code(body.invite_code)

    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT
                c.id AS class_id,
                c.name AS class_name,
                u.name AS teacher_name,
                c.invite_code
            FROM classes c
            JOIN users u ON u.id = c.teacher_id
            WHERE c.invite_code = ?
            """,
            (normalized_code,),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="초대 링크를 찾을 수 없습니다.")

        conn.execute(
            """
            INSERT OR IGNORE INTO class_students (class_id, student_id)
            VALUES (?, ?)
            """,
            (row["class_id"], current_user["id"]),
        )
        joined = conn.execute(
            """
            SELECT joined_at
            FROM class_students
            WHERE class_id = ? AND student_id = ?
            """,
            (row["class_id"], current_user["id"]),
        ).fetchone()
        conn.commit()

    return JoinedClassOut(
        class_id=row["class_id"],
        class_name=row["class_name"],
        teacher_name=row["teacher_name"],
        invite_code=row["invite_code"],
        joined_at=joined["joined_at"],
    )


@router.get("/student", response_model=list[JoinedClassOut])
def list_joined_classes(
    current_user: dict[str, Any] = Depends(_require_student),
) -> list[JoinedClassOut]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT
                c.id AS class_id,
                c.name AS class_name,
                u.name AS teacher_name,
                c.invite_code,
                cs.joined_at
            FROM class_students cs
            JOIN classes c ON c.id = cs.class_id
            JOIN users u ON u.id = c.teacher_id
            WHERE cs.student_id = ?
            ORDER BY cs.id DESC
            """,
            (current_user["id"],),
        ).fetchall()

    return [JoinedClassOut(**dict(row)) for row in rows]
