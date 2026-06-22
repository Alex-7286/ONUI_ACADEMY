import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.database import get_conn
from app.core.jwt_token import decode_access_token

router = APIRouter(prefix="/submissions", tags=["submissions"])
security = HTTPBearer(auto_error=False)


class QuizSubmissionIn(BaseModel):
    level: str
    week: int
    lesson: int
    lesson_title: str
    question_count: int
    correct_count: int
    objective_score: float
    speech_score: float
    total_score: float
    passed: bool
    answers: list[dict[str, Any]] = []
    speech_results: list[dict[str, Any]] = []


def _require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub", "0"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")

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


def _require_student(current_user: dict[str, Any] = Depends(_require_user)) -> dict[str, Any]:
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="학생 계정으로 로그인해주세요.")
    return current_user


def _require_teacher(current_user: dict[str, Any] = Depends(_require_user)) -> dict[str, Any]:
    if current_user["role"] != "teacher" or current_user["approval_status"] != "approved":
        raise HTTPException(status_code=403, detail="승인된 선생님 계정이 필요합니다.")
    return current_user


def _teacher_student_ids(conn, teacher_id: int) -> list[int]:
    rows = conn.execute(
        """
        SELECT DISTINCT cs.student_id
        FROM class_students cs
        JOIN classes c ON c.id = cs.class_id
        WHERE c.teacher_id = ?
        """,
        (teacher_id,),
    ).fetchall()
    return [int(row["student_id"]) for row in rows]


def _student_class_names(conn, student_id: int, teacher_id: int) -> list[str]:
    rows = conn.execute(
        """
        SELECT c.name
        FROM class_students cs
        JOIN classes c ON c.id = cs.class_id
        WHERE cs.student_id = ? AND c.teacher_id = ?
        ORDER BY c.id DESC
        """,
        (student_id, teacher_id),
    ).fetchall()
    return [row["name"] for row in rows]


@router.post("/quiz")
def create_quiz_submission(
    body: QuizSubmissionIn,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_student),
) -> dict[str, Any]:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO quiz_submissions (
                student_id,
                level,
                week,
                lesson,
                lesson_title,
                question_count,
                correct_count,
                objective_score,
                speech_score,
                total_score,
                passed,
                answers_json,
                speech_json,
                ip_address
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                current_user["id"],
                body.level,
                body.week,
                body.lesson,
                body.lesson_title,
                body.question_count,
                body.correct_count,
                body.objective_score,
                body.speech_score,
                body.total_score,
                1 if body.passed else 0,
                json.dumps(body.answers, ensure_ascii=False),
                json.dumps(body.speech_results, ensure_ascii=False),
                request.client.host if request.client else None,
            ),
        )
        conn.commit()

    return {"submissionId": cur.lastrowid}


@router.get("/teacher")
def list_teacher_submissions(
    current_user: dict[str, Any] = Depends(_require_teacher),
) -> dict[str, Any]:
    with get_conn() as conn:
        student_ids = _teacher_student_ids(conn, current_user["id"])
        if not student_ids:
            return {"examSubmissions": [], "quizSubmissions": []}

        placeholders = ",".join("?" for _ in student_ids)
        exam_rows = conn.execute(
            f"""
            SELECT
                es.id,
                es.student_id,
                COALESCE(u.name, '미기재') AS student_name,
                COALESCE(u.email, '') AS student_email,
                es.level,
                es.exam_type,
                es.question_count,
                es.answered_count,
                es.correct_count,
                es.score,
                es.answers_json,
                es.ip_address,
                es.submitted_at
            FROM exam_submissions es
            LEFT JOIN users u ON u.id = es.student_id
            WHERE es.student_id IN ({placeholders})
            ORDER BY es.id DESC
            """,
            student_ids,
        ).fetchall()
        quiz_rows = conn.execute(
            f"""
            SELECT
                qs.id,
                qs.student_id,
                COALESCE(u.name, '미기재') AS student_name,
                COALESCE(u.email, '') AS student_email,
                qs.level,
                qs.week,
                qs.lesson,
                qs.lesson_title,
                qs.question_count,
                qs.correct_count,
                qs.objective_score,
                qs.speech_score,
                qs.total_score,
                qs.passed,
                qs.answers_json,
                qs.speech_json,
                qs.ip_address,
                qs.submitted_at
            FROM quiz_submissions qs
            LEFT JOIN users u ON u.id = qs.student_id
            WHERE qs.student_id IN ({placeholders})
            ORDER BY qs.id DESC
            """,
            student_ids,
        ).fetchall()

        exam_submissions = []
        for row in exam_rows:
            item = dict(row)
            item["class_names"] = _student_class_names(conn, item["student_id"], current_user["id"])
            item["answers"] = json.loads(item.pop("answers_json") or "[]")
            exam_submissions.append(item)

        quiz_submissions = []
        for row in quiz_rows:
            item = dict(row)
            item["class_names"] = _student_class_names(conn, item["student_id"], current_user["id"])
            item["answers"] = json.loads(item.pop("answers_json") or "[]")
            item["speech_results"] = json.loads(item.pop("speech_json") or "[]")
            item["passed"] = bool(item["passed"])
            quiz_submissions.append(item)

    return {
        "examSubmissions": exam_submissions,
        "quizSubmissions": quiz_submissions,
    }
