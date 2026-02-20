"""
Route model for storing route information with PostGIS geometry
"""
from sqlalchemy import Column, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from sqlalchemy.orm import relationship
import uuid
from app.models.base import Base


class Route(Base):
    """
    Route model for storing route geometry and metadata
    Uses PostGIS LineString for geometry storage
    """
    __tablename__ = "routes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    dispatch_id = Column(UUID(as_uuid=True), ForeignKey("dispatches.id"), nullable=False, index=True)
    geometry = Column(
        Geometry(geometry_type='LINESTRING', srid=4326),
        nullable=False
    )
    distance = Column(Float, nullable=False)  # Distance in meters
    duration = Column(Float, nullable=False)  # Duration in seconds
    risk_score = Column(Float, nullable=True)  # Risk score (optional)
    
    # Spatial index on geometry column for efficient spatial queries
    __table_args__ = (
        Index('idx_route_geometry', geometry, postgresql_using='gist'),
    )
    
    # Relationships
    dispatch = relationship("Dispatch", backref="routes")
    
    def __repr__(self):
        return f"<Route(id={self.id}, dispatch_id={self.dispatch_id}, distance={self.distance}, duration={self.duration})>"
