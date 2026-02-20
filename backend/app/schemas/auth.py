"""
Authentication schemas for request/response models
"""
from pydantic import BaseModel, EmailStr
from uuid import UUID
from app.models.user import UserRole


class UserRegister(BaseModel):
    """Volunteer self-registration only. Admins are created via seed."""
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.VOLUNTEER
    phone: str | None = None


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Schema for user information response"""
    id: UUID
    name: str
    email: str
    role: UserRole
    phone: str | None
    created_at: str
    
    class Config:
        from_attributes = True


class TokenData(BaseModel):
    """Schema for token payload data"""
    user_id: UUID | None = None
    email: str | None = None
    role: UserRole | None = None
