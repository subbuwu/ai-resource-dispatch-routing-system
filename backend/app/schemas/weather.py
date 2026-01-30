"""
Pydantic schemas for weather data
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class WeatherData(BaseModel):
    """Current weather data at a location"""
    temperature: Optional[float] = None
    condition: str
    description: str
    humidity: Optional[int] = None
    wind_speed: Optional[float] = None
    rainfall: Optional[float] = None
    alerts: List[Dict[str, Any]] = []
    icon: str
    timestamp: Optional[int] = None
    api_available: bool = False
    city: Optional[str] = None
    country: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None
    safety_status: Optional[str] = None  # safe, caution, unsafe
    safety_message: Optional[str] = None
    calamities: List[Dict[str, Any]] = []


class WeatherRequest(BaseModel):
    """Request schema for weather endpoint"""
    latitude: float
    longitude: float


class RouteWeatherRequest(BaseModel):
    """Request schema for route weather endpoint"""
    coordinates: List[List[float]]  # List of [lng, lat] pairs


class RouteWeatherResponse(BaseModel):
    """Response schema for route weather"""
    route_weather: List[Dict[str, Any]]
    summary: Dict[str, Any]
