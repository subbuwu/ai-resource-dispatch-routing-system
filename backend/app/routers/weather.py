"""
Weather API endpoints
"""
from fastapi import APIRouter, HTTPException
from app.schemas.weather import WeatherRequest, WeatherData, RouteWeatherRequest, RouteWeatherResponse
from app.services.weather_service import get_weather_data, get_weather_along_route

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/", response_model=WeatherData)
def get_current_weather(latitude: float, longitude: float):
    """
    Get current weather data for a location
    
    Query Parameters:
    - latitude: Latitude coordinate
    - longitude: Longitude coordinate
    
    Returns:
    - Current weather information including temperature, condition, rainfall, alerts
    """
    try:
        weather = get_weather_data(latitude, longitude)
        return WeatherData(**weather)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather data: {str(e)}"
        )


@router.post("/", response_model=WeatherData)
def get_weather_by_coordinates(request: WeatherRequest):
    """
    Get current weather data for a location (POST method)
    
    Body:
    - latitude: Latitude coordinate
    - longitude: Longitude coordinate
    
    Returns:
    - Current weather information
    """
    try:
        weather = get_weather_data(request.latitude, request.longitude)
        return WeatherData(**weather)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather data: {str(e)}"
        )


@router.post("/route", response_model=RouteWeatherResponse)
def get_route_weather(request: RouteWeatherRequest):
    """
    Get weather data along a route
    
    Body:
    - coordinates: List of [lng, lat] coordinate pairs representing the route
    
    Returns:
    - Weather data for sampled points along the route
    - Summary statistics (average temperature, max rainfall, alerts)
    """
    try:
        result = get_weather_along_route(request.coordinates)
        return RouteWeatherResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch route weather: {str(e)}"
        )
