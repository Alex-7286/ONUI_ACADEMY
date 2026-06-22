from typing import Literal

from pydantic import BaseModel, Field

UserRole = Literal["student", "teacher"]
ApprovalStatus = Literal["pending", "approved", "rejected"]


class SignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=50)
    role: UserRole = "student"


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = "student"


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    approval_status: ApprovalStatus
    created_at: str | None = None
    last_login_at: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut
