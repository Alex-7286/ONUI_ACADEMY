from typing import Literal

from pydantic import BaseModel, Field

NoticeCategory = Literal["중요", "학사", "점검", "이벤트"]


class NoticeCreateRequest(BaseModel):
    class_id: int = Field(gt=0)
    category: NoticeCategory = "학사"
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=2000)


class NoticeOut(BaseModel):
    id: int
    class_id: int
    class_name: str
    teacher_name: str
    category: NoticeCategory
    title: str
    content: str
    created_at: str
