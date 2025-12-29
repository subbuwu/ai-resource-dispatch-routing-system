from pydantic import BaseModel
from typing import List, Dict, Any

class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float


class Coordinate(BaseModel):
    lng: float
    lat: float


class Point(BaseModel):
    """Represents a geographic point"""
    lat: float
    lng: float


class RouteSummary(BaseModel):
    """Summary information about the route"""
    distance: float  # Distance in meters
    duration: float  # Duration in seconds
    distance_km: float  # Distance in kilometers (formatted)
    duration_min: float  # Duration in minutes (formatted)
    distance_formatted: str  # Human-readable distance (e.g., "1.7 km")
    duration_formatted: str  # Human-readable duration (e.g., "3 min")


class RouteResponse(BaseModel):
    """Structured route response optimized for frontend consumption"""
    summary: RouteSummary
    start: Point
    end: Point
    geometry: Dict[str, Any]  # GeoJSON LineString format
    coordinates: List[List[float]]  # Raw coordinate pairs [lng, lat] for direct use
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary": {
                    "distance": 1732.1,
                    "duration": 178.9,
                    "distance_km": 1.73,
                    "duration_min": 3.0,
                    "distance_formatted": "1.7 km",
                    "duration_formatted": "3 min"
                },
                "start": {
                    "lat": 10.662366,
                    "lng": 76.992166
                },
                "end": {
                    "lat": 10.662183,
                    "lng": 77.002035
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [76.992166, 10.662366],
                        [76.992473, 10.662315]
                    ]
                },
                "coordinates": [
                    [76.992166, 10.662366],
                    [76.992473, 10.662315]
                ]
            }
        }