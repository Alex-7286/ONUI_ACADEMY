from pydantic import BaseModel, Field


class ClassCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class ClassOut(BaseModel):
    id: int
    name: str
    teacher_id: int
    teacher_name: str
    invite_code: str
    student_count: int = 0
    created_at: str | None = None


class InvitePreviewOut(BaseModel):
    class_id: int
    class_name: str
    teacher_name: str
    invite_code: str


class JoinClassRequest(BaseModel):
    invite_code: str = Field(min_length=4, max_length=32)


class JoinedClassOut(BaseModel):
    class_id: int
    class_name: str
    teacher_name: str
    invite_code: str
    joined_at: str | None = None


class ClassStudentOut(BaseModel):
    id: int
    name: str
    email: str
    joined_at: str | None = None
