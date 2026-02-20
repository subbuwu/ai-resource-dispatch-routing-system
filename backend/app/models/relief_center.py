"""
ReliefCenter model for storing disaster relief center information
"""
from sqlalchemy import Column, String, Float
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.models.base import Base


class ReliefCenter(Base):
    """
    Relief center model for storing disaster relief center information
    """
    __tablename__ = "relief_centers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    def __repr__(self):
        return f"<ReliefCenter(id={self.id}, name={self.name}, lat={self.latitude}, lng={self.longitude})>"
