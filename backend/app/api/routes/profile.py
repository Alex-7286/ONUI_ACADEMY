from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.routes.lectures import _load_level_slides
from app.core.database import get_conn
from app.core.jwt_token import decode_access_token

router = APIRouter(prefix="/profile", tags=["profile"])
security = HTTPBearer(auto_error=False)

CURRICULUM_LEVELS = ("초급 1", "초급 2", "중급 1", "중급 2", "고급 1", "고급 2")


def _require_student(
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
            SELECT id, name, email, role, created_at, last_login_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    if row["role"] != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="학생 계정으로 로그인해주세요.")

    return dict(row)


def _grade(score: float) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "D"


def _curriculum_lessons() -> dict[str, list[dict[str, Any]]]:
    return {
        level: sorted(
            _load_level_slides(level).values(),
            key=lambda lesson: (int(lesson.get("week", 0)), int(lesson.get("lesson", 0))),
        )
        for level in CURRICULUM_LEVELS
    }


@router.get("/me")
def get_my_profile(current_user: dict[str, Any] = Depends(_require_student)) -> dict[str, Any]:
    student_id = current_user["id"]

    with get_conn() as conn:
        class_rows = conn.execute(
            """
            SELECT c.name AS class_name, u.name AS teacher_name, cs.joined_at
            FROM class_students cs
            JOIN classes c ON c.id = cs.class_id
            JOIN users u ON u.id = c.teacher_id
            WHERE cs.student_id = ?
            ORDER BY cs.id DESC
            """,
            (student_id,),
        ).fetchall()
        completed_rows = conn.execute(
            """
            SELECT DISTINCT level, week, lesson
            FROM quiz_submissions
            WHERE student_id = ? AND passed = 1
            """,
            (student_id,),
        ).fetchall()
        attendance_row = conn.execute(
            """
            SELECT COUNT(*) AS count
            FROM (
                SELECT attended_on AS active_day
                FROM attendance_logs
                WHERE student_id = ?
                UNION
                SELECT substr(submitted_at, 1, 10) AS active_day
                FROM quiz_submissions
                WHERE student_id = ?
                UNION
                SELECT substr(submitted_at, 1, 10) AS active_day
                FROM exam_submissions
                WHERE student_id = ?
            )
            """,
            (student_id, student_id, student_id),
        ).fetchone()
        registered_days_row = conn.execute(
            """
            SELECT MAX(1, CAST(julianday('now') - julianday(?) AS INTEGER) + 1) AS count
            """,
            (current_user["created_at"],),
        ).fetchone()
        exam_score_rows = conn.execute(
            """
            SELECT level, exam_type, score
            FROM exam_submissions
            WHERE student_id = ?
              AND id IN (
                  SELECT MIN(id)
                  FROM exam_submissions
                  WHERE student_id = ?
                  GROUP BY level, exam_type
              )
            """,
            (student_id, student_id),
        ).fetchall()
        exam_rows = conn.execute(
            """
            SELECT level, exam_type
            FROM exam_submissions
            WHERE student_id = ?
            GROUP BY level, exam_type
            """,
            (student_id,),
        ).fetchall()

    curriculum_lessons = _curriculum_lessons()
    lesson_counts = {level: len(lessons) for level, lessons in curriculum_lessons.items()}
    total_lessons = sum(lesson_counts.values())
    completed_lessons = len(completed_rows)
    learning_percent = round((completed_lessons / total_lessons) * 100) if total_lessons else 0

    completed_by_level: dict[str, int] = {}
    for row in completed_rows:
        completed_by_level[row["level"]] = completed_by_level.get(row["level"], 0) + 1

    attendance_days = int(attendance_row["count"] or 0)
    registered_days = int(registered_days_row["count"] or 1)
    attendance_percent = min(100, round((attendance_days / registered_days) * 100))

    first_exam_scores = {
        (row["level"], row["exam_type"]): float(row["score"])
        for row in exam_score_rows
    }
    exam_scores = list(first_exam_scores.values())
    grade_counts = {grade: 0 for grade in ("A", "B", "C", "D")}
    for score in exam_scores:
        grade_counts[_grade(score)] += 1

    average_score = round(sum(exam_scores) / len(exam_scores), 1) if exam_scores else 0
    submitted_exam_keys = {(row["level"], row["exam_type"]) for row in exam_rows}
    exam_statuses = [
        {
            "level": level,
            "midterm": "응시" if (level, "midterm") in submitted_exam_keys else "미응시",
            "final": "응시" if (level, "final") in submitted_exam_keys else "미응시",
        }
        for level in CURRICULUM_LEVELS
    ]

    previous_level_complete = True
    level_grades = []
    for level in CURRICULUM_LEVELS:
        level_total_lessons = lesson_counts.get(level, 0)
        level_completed_lessons = completed_by_level.get(level, 0)
        level_progress = (
            round((level_completed_lessons / level_total_lessons) * 100)
            if level_total_lessons
            else 0
        )
        midterm_score = first_exam_scores.get((level, "midterm"))
        final_score = first_exam_scores.get((level, "final"))
        level_exam_scores = [score for score in (midterm_score, final_score) if score is not None]
        level_average = round(sum(level_exam_scores) / len(level_exam_scores), 1) if level_exam_scores else None

        level_grades.append(
            {
                "level": level,
                "averageScore": level_average,
                "grade": _grade(level_average) if level_average is not None else None,
                "progress": level_progress,
                "completedLessons": level_completed_lessons,
                "totalLessons": level_total_lessons,
                "midtermScore": midterm_score,
                "finalScore": final_score,
                "locked": not previous_level_complete,
            }
        )

        if level_total_lessons and level_progress < 100:
            previous_level_complete = False

    active_level = next(
        (item for item in reversed(level_grades) if item["completedLessons"] or item["averageScore"] is not None),
        level_grades[0],
    )
    completed_lesson_keys = {
        (row["level"], int(row["week"]), int(row["lesson"]))
        for row in completed_rows
    }
    home_level = next(
        (
            item
            for item in level_grades
            if not item["locked"] and item["totalLessons"] > 0 and item["progress"] < 100
        ),
        next((item for item in level_grades if item["totalLessons"] > 0), level_grades[0]),
    )
    next_lesson = next(
        (
            lesson
            for lesson in curriculum_lessons.get(home_level["level"], [])
            if (home_level["level"], int(lesson["week"]), int(lesson["lesson"])) not in completed_lesson_keys
        ),
        None,
    )
    home_progress = {
        "level": home_level["level"],
        "percent": home_level["progress"],
        "completedLessons": home_level["completedLessons"],
        "totalLessons": home_level["totalLessons"],
        "nextLesson": (
            {
                "week": int(next_lesson["week"]),
                "lesson": int(next_lesson["lesson"]),
                "title": str(next_lesson.get("title") or f"{next_lesson['lesson']}차시"),
            }
            if next_lesson
            else None
        ),
    }

    return {
        "user": {
            "id": current_user["id"],
            "name": current_user["name"],
            "email": current_user["email"],
            "createdAt": current_user["created_at"],
            "lastLoginAt": current_user["last_login_at"],
        },
        "classes": [dict(row) for row in class_rows],
        "learning": {
            "completedLessons": completed_lessons,
            "totalLessons": total_lessons,
            "percent": learning_percent,
        },
        "attendance": {
            "days": attendance_days,
            "totalDays": registered_days,
            "percent": attendance_percent,
        },
        "examStatuses": exam_statuses,
        "levelGrades": level_grades,
        "currentLevel": active_level,
        "homeProgress": home_progress,
        "grades": {
            "averageScore": average_score,
            "subjectCount": len(exam_scores),
            "counts": grade_counts,
        },
    }
