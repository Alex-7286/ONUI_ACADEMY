from typing import Literal

from pydantic import BaseModel, Field

TeacherApprovalStatus = Literal["pending", "approved", "rejected"]
TeacherApprovalAction = Literal["approve", "reject"]


class AdminLoginRequest(BaseModel):
    admin_id: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=100)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TeacherApprovalRequest(BaseModel):
    action: TeacherApprovalAction


class TeacherApplicationOut(BaseModel):
    id: int
    email: str
    name: str
    approval_status: TeacherApprovalStatus
    created_at: str | None = None
