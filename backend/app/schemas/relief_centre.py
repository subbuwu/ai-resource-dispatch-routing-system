"""
Schemas for relief centre API endpoints
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.database import ReliefCentreStatus


class ReliefCentreBase(BaseModel):
    """Base schema for relief centre"""
    name: str
    latitude: float
    longitude: float
    capacity: Optional[int] = None
    status: ReliefCentreStatus = ReliefCentreStatus.ACTIVE


class ReliefCentreCreate(ReliefCentreBase):
    """Schema for creating a relief centre"""
    pass


class ReliefCentreResponse(ReliefCentreBase):
    """Schema for relief centre response"""
    id: int
    
    class Config:
        from_attributes = True


class NearestReliefCentreRequest(BaseModel):
    """Request schema for finding nearest relief centre"""
    latitude: float
    longitude: float


class NearestReliefCentreResponse(BaseModel):
    """Response schema for nearest relief centre with route"""
    relief_centre: ReliefCentreResponse
    route: Dict[str, Any]  # Route geometry and summary from OSRM
    distance: float  # Distance in meters
    duration: float  # Duration in seconds
    distance_formatted: str
    duration_formatted: str


# Relief request schemas (for volunteers to see requests at their centre)
class ReliefRequestCreate(BaseModel):
    """Schema for creating a relief request (when user confirms on Need Help page)"""
    relief_centre_id: int
    latitude: float
    longitude: float
    supplies: List[str]


class ReliefRequestResponse(BaseModel):
    """Schema for a single relief request"""
    id: int
    relief_centre_id: int
    latitude: float
    longitude: float
    supplies: List[str]
    status: str
    created_at: str

