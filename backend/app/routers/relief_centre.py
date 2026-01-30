"""
API endpoints for relief centres
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.database import get_db, ReliefCentre, ReliefRequest, ReliefRequestStatus
from app.schemas.relief_centre import (
    ReliefCentreResponse,
    NearestReliefCentreRequest,
    NearestReliefCentreResponse,
    ReliefRequestCreate,
    ReliefRequestResponse,
)
from app.services.relief_centre_service import (
    get_all_active_relief_centres,
    find_nearest_relief_centre
)

router = APIRouter(prefix="/relief-centres", tags=["Relief Centres"])


@router.get("/", response_model=List[ReliefCentreResponse])
def get_relief_centres(db: Session = Depends(get_db)):
    """
    Get all active relief centres
    
    Returns a list of all relief centres with status='active'
    """
    centres = get_all_active_relief_centres(db)
    return centres


@router.post("/nearest", response_model=NearestReliefCentreResponse)
def find_nearest_relief_centre_endpoint(
    request: NearestReliefCentreRequest,
    db: Session = Depends(get_db)
):
    """
    Find the nearest relief centre to user location
    
    Uses OSRM routing to calculate actual travel distance/time to all active
    relief centres and returns the nearest one with route geometry.
    
    Input:
    - latitude: User's latitude
    - longitude: User's longitude
    
    Returns:
    - relief_centre: Nearest relief centre information
    - route: Complete route geometry (GeoJSON) and summary
    - distance: Travel distance in meters
    - duration: Estimated travel time in seconds
    - distance_formatted: Human-readable distance
    - duration_formatted: Human-readable duration
    
    Errors:
    - 404: No active relief centres found
    - 503: OSRM service unavailable
    """
    try:
        result = find_nearest_relief_centre(
            db,
            request.latitude,
            request.longitude
        )
        
        return NearestReliefCentreResponse(
            relief_centre=ReliefCentreResponse(
                id=result["relief_centre"].id,
                name=result["relief_centre"].name,
                latitude=result["relief_centre"].latitude,
                longitude=result["relief_centre"].longitude,
                capacity=result["relief_centre"].capacity,
                status=result["relief_centre"].status
            ),
            route=result["route"],
            distance=result["distance"],
            duration=result["duration"],
            distance_formatted=result["distance_formatted"],
            duration_formatted=result["duration_formatted"]
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Routing service error: {str(e)}"
        )


@router.post("/requests", response_model=ReliefRequestResponse)
def create_relief_request(
    body: ReliefRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Create a relief request (called when user confirms supply request on Need Help page).
    Volunteers at the relief centre can see this request.
    """
    centre = db.query(ReliefCentre).filter(ReliefCentre.id == body.relief_centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Relief centre not found")
    req = ReliefRequest(
        relief_centre_id=body.relief_centre_id,
        latitude=body.latitude,
        longitude=body.longitude,
        supplies=json.dumps(body.supplies),
        status=ReliefRequestStatus.PENDING,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    supplies_list = json.loads(req.supplies) if isinstance(req.supplies, str) else req.supplies
    return ReliefRequestResponse(
        id=req.id,
        relief_centre_id=req.relief_centre_id,
        latitude=req.latitude,
        longitude=req.longitude,
        supplies=supplies_list,
        status=req.status.value,
        created_at=req.created_at.isoformat() if req.created_at else "",
    )


@router.get("/{centre_id}/requests", response_model=List[ReliefRequestResponse])
def get_requests_for_centre(
    centre_id: int,
    db: Session = Depends(get_db)
):
    """
    List all requests for a relief centre (for volunteers working at that centre).
    """
    centre = db.query(ReliefCentre).filter(ReliefCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Relief centre not found")
    requests = (
        db.query(ReliefRequest)
        .filter(ReliefRequest.relief_centre_id == centre_id)
        .order_by(desc(ReliefRequest.created_at))
        .all()
    )
    result = []
    for req in requests:
        supplies_list = json.loads(req.supplies) if isinstance(req.supplies, str) else req.supplies
        result.append(
            ReliefRequestResponse(
                id=req.id,
                relief_centre_id=req.relief_centre_id,
                latitude=req.latitude,
                longitude=req.longitude,
                supplies=supplies_list,
                status=req.status.value,
                created_at=req.created_at.isoformat() if req.created_at else "",
            )
        )
    return result

