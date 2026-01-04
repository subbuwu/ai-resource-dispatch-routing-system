"""
Service for finding nearest relief centre using OSRM routing
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database import ReliefCentre, ReliefCentreStatus
from app.services.osrm_service import get_route
import math


def get_all_active_relief_centres(db: Session) -> List[ReliefCentre]:
    """
    Get all active relief centres from database
    
    Args:
        db: Database session
    
    Returns:
        List of active relief centres
    """
    return db.query(ReliefCentre).filter(
        ReliefCentre.status == ReliefCentreStatus.ACTIVE
    ).all()


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate approximate distance between two points using Haversine formula
    Used for initial filtering before OSRM routing
    
    Args:
        lat1, lon1: First point coordinates
        lat2, lon2: Second point coordinates
    
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (
        math.sin(dlat / 2) ** 2 +
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
        math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


def find_nearest_relief_centre(
    db: Session,
    user_lat: float,
    user_lng: float
) -> Dict[str, Any]:
    """
    Find the nearest relief centre to user location using OSRM routing
    
    Logic:
    1. Get all active relief centres
    2. Use Haversine formula to get approximate distances (for filtering)
    3. Use OSRM route API to get accurate travel distance/time for top candidates
    4. Select the nearest based on travel distance
    
    Args:
        db: Database session
        user_lat: User latitude
        user_lng: User longitude
    
    Returns:
        Dictionary with relief centre info and route details
    
    Raises:
        ValueError: If no active relief centres found
        Exception: If OSRM routing fails
    """
    # Get all active relief centres
    centres = get_all_active_relief_centres(db)
    
    if not centres:
        raise ValueError("No active relief centres found")
    
    # Calculate approximate distances using Haversine (for initial filtering)
    # This helps us prioritize which centres to check with OSRM
    centre_distances = []
    for centre in centres:
        approx_distance_km = calculate_haversine_distance(
            user_lat, user_lng,
            centre.latitude, centre.longitude
        )
        centre_distances.append({
            "centre": centre,
            "approx_distance_km": approx_distance_km
        })
    
    # Sort by approximate distance and check top 5 with OSRM
    # This balances accuracy with API call efficiency
    centre_distances.sort(key=lambda x: x["approx_distance_km"])
    top_candidates = centre_distances[:min(5, len(centre_distances))]
    
    # Use OSRM to get accurate travel distance/time for top candidates
    nearest_centre = None
    min_distance = float('inf')
    best_route = None
    
    for candidate in top_candidates:
        centre = candidate["centre"]
        
        try:
            # Get route from user to this relief centre using OSRM
            route = get_route(
                user_lat, user_lng,
                centre.latitude, centre.longitude
            )
            
            route_distance = route["summary"]["distance"]
            
            # Track the nearest centre based on actual travel distance
            if route_distance < min_distance:
                min_distance = route_distance
                nearest_centre = centre
                best_route = route
        
        except Exception as e:
            # If OSRM fails for this centre, skip it and try next
            print(f"Warning: Failed to get route to {centre.name}: {e}")
            continue
    
    if not nearest_centre:
        raise Exception("Failed to find route to any relief centre. OSRM may be unavailable.")
    
    # Return nearest centre with route information
    return {
        "relief_centre": nearest_centre,
        "route": best_route,
        "distance": best_route["summary"]["distance"],
        "duration": best_route["summary"]["duration"],
        "distance_formatted": best_route["summary"]["distance_formatted"],
        "duration_formatted": best_route["summary"]["duration_formatted"]
    }

