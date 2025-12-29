import requests
from typing import Dict, Any

OSRM_BASE_URL = "http://localhost:4000"

def format_distance(distance_meters: float) -> str:
    """Format distance in a human-readable format"""
    if distance_meters < 1000:
        return f"{int(distance_meters)} m"
    else:
        km = distance_meters / 1000
        return f"{km:.1f} km" if km < 10 else f"{int(km)} km"


def format_duration(duration_seconds: float) -> str:
    """Format duration in a human-readable format"""
    if duration_seconds < 60:
        return f"{int(duration_seconds)} sec"
    elif duration_seconds < 3600:
        minutes = duration_seconds / 60
        return f"{int(minutes)} min" if minutes < 60 else f"{int(minutes)} min"
    else:
        hours = int(duration_seconds / 3600)
        minutes = int((duration_seconds % 3600) / 60)
        if minutes > 0:
            return f"{hours}h {minutes}min"
        return f"{hours}h"


def get_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Dict[str, Any]:
    """
    Get route from OSRM and return structured response for frontend
    
    Returns a structured response with:
    - Summary with formatted distance/duration
    - Start and end points
    - GeoJSON geometry for mapping libraries
    - Raw coordinates array for direct use
    """
    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{start_lng},{start_lat};{end_lng},{end_lat}"
        "?overview=full&geometries=geojson"
    )

    response = requests.get(url)
    response.raise_for_status()

    data = response.json()
    route = data["routes"][0]
    
    # Extract geometry coordinates
    coordinates = route["geometry"]["coordinates"]
    distance = route["distance"]
    duration = route["duration"]
    
    # Get start and end points
    start_coord = coordinates[0]
    end_coord = coordinates[-1]
    
    # Build structured response
    return {
        "summary": {
            "distance": distance,
            "duration": duration,
            "distance_km": round(distance / 1000, 2),
            "duration_min": round(duration / 60, 1),
            "distance_formatted": format_distance(distance),
            "duration_formatted": format_duration(duration)
        },
        "start": {
            "lat": start_coord[1],
            "lng": start_coord[0]
        },
        "end": {
            "lat": end_coord[1],
            "lng": end_coord[0]
        },
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates
        },
        "coordinates": coordinates  # Keep raw format for direct use
    }
