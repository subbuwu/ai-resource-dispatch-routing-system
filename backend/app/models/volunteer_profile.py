"""
VolunteerProfile model for storing volunteer information
"""
from sqlalchemy import Column, String, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from app.models.base import Base


class AvailabilityStatus(str, enum.Enum):
    """Volunteer availability status enumeration"""
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"


class VolunteerProfile(Base):
    """
    Volunteer profile model linking users to relief centers
    """
    __tablename__ = "volunteer_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    relief_center_id = Column(UUID(as_uuid=True), ForeignKey("relief_centers.id"), nullable=False, index=True)
    vehicle_type = Column(String(100), nullable=True)
    availability_status = Column(
        SQLEnum(AvailabilityStatus, native_enum=False),
        nullable=False,
        default=AvailabilityStatus.AVAILABLE,
        index=True
    )
    
    # Relationships
    user = relationship("User", backref="volunteer_profile")
    relief_center = relationship("ReliefCenter", backref="volunteers")
    
    def __repr__(self):
        return f"<VolunteerProfile(id={self.id}, user_id={self.user_id}, relief_center_id={self.relief_center_id}, status={self.availability_status})>"
