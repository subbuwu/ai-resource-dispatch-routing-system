"""
Dispatch model for storing dispatch assignments and volunteer live location
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime
from app.models.base import Base


class DispatchStatus(str, enum.Enum):
    """Dispatch status enumeration"""
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Dispatch(Base):
    """
    Dispatch model for storing volunteer assignments to relief requests.
    volunteer_latitude/longitude/location_updated_at for live tracking.
    """
    __tablename__ = "dispatches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    request_id = Column(UUID(as_uuid=True), ForeignKey("relief_requests.id"), nullable=False, index=True)
    volunteer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    assigned_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    status = Column(
        SQLEnum(DispatchStatus, native_enum=False),
        nullable=False,
        default=DispatchStatus.PENDING,
        index=True
    )
    volunteer_latitude = Column(Float, nullable=True)
    volunteer_longitude = Column(Float, nullable=True)
    location_updated_at = Column(DateTime, nullable=True)

    # Relationships
    request = relationship("ReliefRequest", backref="dispatches")
    volunteer = relationship("User", backref="dispatches")
    
    def __repr__(self):
        return f"<Dispatch(id={self.id}, request_id={self.request_id}, volunteer_id={self.volunteer_id}, status={self.status})>"
