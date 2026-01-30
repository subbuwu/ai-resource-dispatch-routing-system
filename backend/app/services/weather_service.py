"""
Weather service for fetching real-time weather data from OpenWeatherMap API
"""
import requests
import os
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# OpenWeatherMap API configuration
# Get your free API key from: https://openweathermap.org/api
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"


def assess_safety_status(weather_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Assess safety status based on weather conditions
    
    Returns:
        Dictionary with safety status, message, and calamities list
    """
    condition = weather_info.get("condition", "").lower()
    rainfall = weather_info.get("rainfall", 0.0) or 0.0
    wind_speed = weather_info.get("wind_speed", 0.0) or 0.0
    alerts = weather_info.get("alerts", [])
    
    calamities = []
    safety_level = "safe"  # safe, caution, unsafe
    
    # Check for heavy rainfall
    if rainfall > 20.0:  # mm/h - heavy rain
        calamities.append({
            "type": "Heavy Rainfall",
            "severity": "high",
            "description": f"Heavy rainfall detected: {rainfall:.1f}mm/h"
        })
        safety_level = "unsafe"
    elif rainfall > 10.0:
        calamities.append({
            "type": "Moderate Rainfall",
            "severity": "moderate",
            "description": f"Moderate rainfall: {rainfall:.1f}mm/h"
        })
        safety_level = "caution"
    
    # Check for severe weather conditions
    if condition in ["thunderstorm", "extreme"]:
        calamities.append({
            "type": "Severe Weather",
            "severity": "high",
            "description": f"Severe weather condition: {condition}"
        })
        safety_level = "unsafe"
    elif condition in ["heavy rain", "squall", "tornado"]:
        calamities.append({
            "type": "Dangerous Weather",
            "severity": "high",
            "description": f"Dangerous weather: {condition}"
        })
        safety_level = "unsafe"
    
    # Check for high wind speeds
    if wind_speed > 20.0:  # m/s - strong wind
        calamities.append({
            "type": "Strong Winds",
            "severity": "moderate",
            "description": f"Strong winds: {wind_speed:.1f}m/s"
        })
        if safety_level == "safe":
            safety_level = "caution"
    
    # Check for alerts
    if alerts:
        for alert in alerts:
            calamities.append({
                "type": alert.get("event", "Weather Alert"),
                "severity": alert.get("severity", "moderate"),
                "description": alert.get("description", "")
            })
            if alert.get("severity") == "high":
                safety_level = "unsafe"
    
    # Generate safety message
    if safety_level == "unsafe":
        message = "⚠️ NOT SAFE TO TRAVEL - Severe weather conditions detected"
    elif safety_level == "caution":
        message = "⚠️ TRAVEL WITH CAUTION - Adverse weather conditions"
    else:
        message = "✅ SAFE TO TRAVEL - Weather conditions are favorable"
    
    return {
        "status": safety_level,
        "message": message,
        "calamities": calamities
    }


def get_weather_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Fetch current weather data from OpenWeatherMap API
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
    
    Returns:
        Dictionary containing weather information including:
        - temperature (Celsius)
        - condition (main weather condition)
        - description (detailed description)
        - humidity (%)
        - wind_speed (m/s)
        - rainfall (mm/h) - from rain data if available
        - alerts (weather alerts if any)
        - icon (weather icon code)
        - timestamp (current time)
    
    Raises:
        Exception: If API call fails or API key is missing
    """
    if not OPENWEATHER_API_KEY:
        # Return mock data if API key is not configured
        # Use current Unix timestamp
        mock_data = {
            "temperature": 28.5,
            "condition": "Clear",
            "description": "Clear sky",
            "humidity": 65,
            "wind_speed": 3.2,
            "rainfall": 0.0,
            "alerts": [],
            "icon": "01d",
            "timestamp": int(time.time()),  # Unix timestamp as integer
            "api_available": False,
            "message": "OpenWeatherMap API key not configured. Using sample data."
        }
        # Assess safety for mock data
        safety_status = assess_safety_status(mock_data)
        mock_data["safety_status"] = safety_status["status"]
        mock_data["safety_message"] = safety_status["message"]
        mock_data["calamities"] = safety_status["calamities"]
        return mock_data
    
    try:
        # Current weather endpoint
        url = f"{OPENWEATHER_BASE_URL}/weather"
        params = {
            "lat": latitude,
            "lon": longitude,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric"  # Get temperature in Celsius
        }
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract weather information
        weather_info = {
            "temperature": data.get("main", {}).get("temp", 0),
            "condition": data.get("weather", [{}])[0].get("main", "Unknown"),
            "description": data.get("weather", [{}])[0].get("description", "Unknown"),
            "humidity": data.get("main", {}).get("humidity", 0),
            "wind_speed": data.get("wind", {}).get("speed", 0),
            "rainfall": data.get("rain", {}).get("1h", 0.0) if "rain" in data else 0.0,
            "alerts": [],  # Alerts would come from a separate alerts endpoint
            "icon": data.get("weather", [{}])[0].get("icon", "01d"),
            "timestamp": data.get("dt", 0),
            "api_available": True,
            "city": data.get("name", "Unknown"),
            "country": data.get("sys", {}).get("country", "Unknown")
        }
        
        # Get weather alerts if available (requires One Call API 3.0 subscription)
        # For free tier, we'll check for severe weather conditions
        weather_main = weather_info["condition"].lower()
        if weather_main in ["thunderstorm", "heavy rain", "extreme"]:
            weather_info["alerts"] = [{
                "event": "Severe Weather Warning",
                "description": f"Current conditions: {weather_info['description']}",
                "severity": "moderate"
            }]
        
        # Assess safety status based on weather conditions
        safety_status = assess_safety_status(weather_info)
        weather_info["safety_status"] = safety_status["status"]
        weather_info["safety_message"] = safety_status["message"]
        weather_info["calamities"] = safety_status["calamities"]
        
        return weather_info
        
    except requests.exceptions.RequestException as e:
        # Return error information
        error_data = {
            "temperature": None,
            "condition": "Unknown",
            "description": f"Weather data unavailable: {str(e)}",
            "humidity": None,
            "wind_speed": None,
            "rainfall": None,
            "alerts": [],
            "icon": "50d",
            "timestamp": None,
            "api_available": False,
            "error": str(e)
        }
        # Assess safety for error case (default to caution)
        safety_status = assess_safety_status(error_data)
        error_data["safety_status"] = safety_status["status"]
        error_data["safety_message"] = "⚠️ Weather data unavailable - Travel with caution"
        error_data["calamities"] = []
        return error_data


def get_weather_along_route(
    coordinates: list,
    sample_points: int = 5
) -> Dict[str, Any]:
    """
    Get weather data for multiple points along a route
    
    Args:
        coordinates: List of [lng, lat] coordinate pairs
        sample_points: Number of points to sample along the route
    
    Returns:
        Dictionary with weather data for sampled points and summary
    """
    if not coordinates or len(coordinates) < 2:
        return {
            "route_weather": [],
            "summary": {
                "avg_temperature": None,
                "max_rainfall": None,
                "has_alerts": False
            }
        }
    
    # Sample points along the route
    step = max(1, len(coordinates) // sample_points)
    sampled_coords = coordinates[::step][:sample_points]
    
    route_weather = []
    total_temp = 0
    max_rainfall = 0
    has_alerts = False
    
    for coord in sampled_coords:
        lng, lat = coord[0], coord[1]
        weather = get_weather_data(lat, lng)
        route_weather.append({
            "location": {"lat": lat, "lng": lng},
            "weather": weather
        })
        
        if weather.get("temperature") is not None:
            total_temp += weather["temperature"]
        if weather.get("rainfall"):
            max_rainfall = max(max_rainfall, weather["rainfall"])
        if weather.get("alerts"):
            has_alerts = True
    
    avg_temp = total_temp / len(route_weather) if route_weather else None
    
    return {
        "route_weather": route_weather,
        "summary": {
            "avg_temperature": round(avg_temp, 1) if avg_temp else None,
            "max_rainfall": round(max_rainfall, 2) if max_rainfall else None,
            "has_alerts": has_alerts,
            "points_sampled": len(route_weather)
        }
    }
