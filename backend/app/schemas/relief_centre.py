"""
Schemas for relief centre API endpoints
"""
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from uuid import UUID


class ReliefCentreBase(BaseModel):
    """Base schema for relief centre"""
    name: str
    latitude: float
    longitude: float


class ReliefCentreCreate(ReliefCentreBase):
    """Schema for creating a relief centre"""
    pass


class ReliefCentreResponse(ReliefCentreBase):
    """Schema for relief centre response"""
    id: UUID
    
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


# Relief request: created by requester (device_id), no auth
class ReliefRequestCreate(BaseModel):
    """Requester submits with device_id (from localStorage)."""
    device_id: str
    relief_centre_id: UUID
    latitude: float
    longitude: float
    supplies: List[str]


class ReliefRequestResponse(BaseModel):
    """Single relief request for volunteer view."""
    id: UUID
    relief_centre_id: UUID
    requester_name: str
    requester_phone: str
    latitude: float
    longitude: float
    supplies: List[str]
    status: str
    created_at: str


class RequestStatusUpdate(BaseModel):
    """Volunteer updates request status (IN_PROGRESS, COMPLETED)."""
    status: str  # IN_PROGRESS | COMPLETED


class DispatchLocationUpdate(BaseModel):
    """Volunteer sends current GPS for live tracking."""
    latitude: float
    longitude: float


class TrackingResponse(BaseModel):
    """For victim: request status + volunteer location + route/ETA."""
    request_id: UUID
    status: str
    requester_name: Optional[str] = None
    requester_phone: Optional[str] = None
    victim_latitude: float
    victim_longitude: float
    relief_centre_id: UUID
    relief_centre_name: Optional[str] = None
    volunteer_name: Optional[str] = None
    volunteer_latitude: Optional[float] = None
    volunteer_longitude: Optional[float] = None
    location_updated_at: Optional[str] = None
    route_to_victim: Optional[Dict[str, Any]] = None  # OSRM route from volunteer to victim
    eta_minutes: Optional[float] = None

