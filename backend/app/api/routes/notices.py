from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.classes import _require_student, _require_teacher
from app.core.database import get_conn
from app.schemas.notices import NoticeCreateRequest, NoticeOut

router = APIRouter(prefix="/notices", tags=["notices"])


def _notice_out(row: Any) -> NoticeOut:
    return NoticeOut(**dict(row))


NOTICE_SELECT = """
    SELECT n.id, n.class_id, c.name AS class_name, teacher.name AS teacher_name,
           n.category, n.title, n.content, n.created_at
    FROM notices n
    JOIN classes c ON c.id = n.class_id
    JOIN users teacher ON teacher.id = n.teacher_id
"""


@router.get("", response_model=list[NoticeOut])
def list_student_notices(
    current_user: dict[str, Any] = Depends(_require_student),
) -> list[NoticeOut]:
    with get_conn() as conn:
        rows = conn.execute(
            f"""
            {NOTICE_SELECT}
            JOIN class_students cs ON cs.class_id = n.class_id
            WHERE cs.student_id = ?
            ORDER BY n.id DESC
            """,
            (current_user["id"],),
        ).fetchall()

    return [_notice_out(row) for row in rows]


@router.get("/teacher", response_model=list[NoticeOut])
def list_teacher_notices(
    current_user: dict[str, Any] = Depends(_require_teacher),
) -> list[NoticeOut]:
    with get_conn() as conn:
        rows = conn.execute(
            f"""
            {NOTICE_SELECT}
            WHERE n.teacher_id = ?
            ORDER BY n.id DESC
            """,
            (current_user["id"],),
        ).fetchall()

    return [_notice_out(row) for row in rows]


@router.get("/{notice_id}", response_model=NoticeOut)
def get_student_notice(
    notice_id: int,
    current_user: dict[str, Any] = Depends(_require_student),
) -> NoticeOut:
    with get_conn() as conn:
        row = conn.execute(
            f"""
            {NOTICE_SELECT}
            JOIN class_students cs ON cs.class_id = n.class_id
            WHERE n.id = ? AND cs.student_id = ?
            """,
            (notice_id, current_user["id"]),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공지사항을 찾을 수 없습니다.")

    return _notice_out(row)


@router.post("", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
def create_notice(
    body: NoticeCreateRequest,
    current_user: dict[str, Any] = Depends(_require_teacher),
) -> NoticeOut:
    title = body.title.strip()
    content = body.content.strip()
    if not title or not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="공지 제목과 내용을 입력해주세요.")

    with get_conn() as conn:
        class_row = conn.execute(
            "SELECT id FROM classes WHERE id = ? AND teacher_id = ?",
            (body.class_id, current_user["id"]),
        ).fetchone()
        if not class_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="발송할 반 정보를 찾을 수 없습니다.")

        created = conn.execute(
            """
            INSERT INTO notices (teacher_id, class_id, category, title, content)
            VALUES (?, ?, ?, ?, ?)
            """,
            (current_user["id"], body.class_id, body.category, title, content),
        )
        row = conn.execute(
            f"""
            {NOTICE_SELECT}
            WHERE n.id = ?
            """,
            (created.lastrowid,),
        ).fetchone()
        conn.commit()

    return _notice_out(row)
