"""
User model for authentication and user management
"""
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from datetime import datetime
from app.models.base import Base


class UserRole(str, enum.Enum):
    """Staff only: volunteers see requests; admins manage relief centres."""
    VOLUNTEER = "VOLUNTEER"
    ADMIN = "ADMIN"


class User(Base):
    """
    User model for storing user information
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        SQLEnum(UserRole, native_enum=False),
        nullable=False,
        index=True
    )
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<User(id={self.id}, name={self.name}, email={self.email}, role={self.role})>"
