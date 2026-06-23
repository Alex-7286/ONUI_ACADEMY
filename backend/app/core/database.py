import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "app.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'teacher')),
                approval_status TEXT NOT NULL DEFAULT 'approved'
                    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                last_login_at TEXT
            )
            """
        )

        columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(users)").fetchall()
        }
        if "role" not in columns:
            conn.execute(
                """
                ALTER TABLE users
                ADD COLUMN role TEXT NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'teacher'))
                """
            )

        if "approval_status" not in columns:
            conn.execute(
                """
                ALTER TABLE users
                ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'
                    CHECK (approval_status IN ('pending', 'approved', 'rejected'))
                """
            )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                invite_code TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS class_students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                joined_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE (class_id, student_id),
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS attendance_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                attended_on TEXT NOT NULL,
                UNIQUE (student_id, attended_on),
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS notices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER NOT NULL,
                class_id INTEGER NOT NULL,
                category TEXT NOT NULL DEFAULT '학사',
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_notices_class_created ON notices(class_id, id DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_notices_teacher_created ON notices(teacher_id, id DESC)")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS exam_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                level TEXT NOT NULL,
                exam_type TEXT NOT NULL,
                question_count INTEGER NOT NULL DEFAULT 0,
                answered_count INTEGER NOT NULL DEFAULT 0,
                correct_count INTEGER NOT NULL DEFAULT 0,
                score REAL NOT NULL DEFAULT 0,
                answers_json TEXT NOT NULL DEFAULT '[]',
                ip_address TEXT,
                submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS quiz_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                level TEXT NOT NULL,
                week INTEGER NOT NULL,
                lesson INTEGER NOT NULL,
                lesson_title TEXT NOT NULL,
                question_count INTEGER NOT NULL DEFAULT 0,
                correct_count INTEGER NOT NULL DEFAULT 0,
                objective_score REAL NOT NULL DEFAULT 0,
                speech_score REAL NOT NULL DEFAULT 0,
                total_score REAL NOT NULL DEFAULT 0,
                passed INTEGER NOT NULL DEFAULT 0,
                answers_json TEXT NOT NULL DEFAULT '[]',
                speech_json TEXT NOT NULL DEFAULT '[]',
                ip_address TEXT,
                submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL
            )
            """
        )

        conn.commit()
