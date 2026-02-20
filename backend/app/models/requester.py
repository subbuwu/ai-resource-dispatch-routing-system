"""
Requester model: victims requesting help (device_id-based, no password).
"""
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime
from app.models.base import Base


class Requester(Base):
    """
    Requester (victim) identified by device_id stored in browser localStorage.
    No login; name and phone collected on first request.
    """
    __tablename__ = "requesters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    device_id = Column(String(36), unique=True, nullable=False, index=True)  # UUID string
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Requester(device_id={self.device_id}, full_name={self.full_name})>"
