"""
ReliefRequest model: request for help linked to a Requester (device_id) and a ReliefCenter.
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum as SQLEnum, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime
from app.models.base import Base


class ReliefRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class ReliefRequest(Base):
    __tablename__ = "relief_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("requesters.id"), nullable=False, index=True)
    relief_centre_id = Column(UUID(as_uuid=True), ForeignKey("relief_centers.id"), nullable=False, index=True)
    request_type = Column(String(255), nullable=False, default="supplies")  # e.g. "supplies"
    supplies = Column(JSONB, nullable=True)  # ["food", "medical", ...]
    urgency_level = Column(Integer, nullable=False, default=3, index=True)
    status = Column(
        SQLEnum(ReliefRequestStatus, native_enum=False),
        nullable=False,
        default=ReliefRequestStatus.PENDING,
        index=True,
    )
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        CheckConstraint("urgency_level >= 1 AND urgency_level <= 5", name="check_urgency_level"),
    )

    requester = relationship("Requester", backref="relief_requests")
    relief_centre = relationship("ReliefCenter", backref="relief_requests")

    def __repr__(self):
        return f"<ReliefRequest(id={self.id}, requester_id={self.requester_id}, status={self.status})>"
