"""
Relief centres: public list/nearest/request; volunteer-only view requests.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from uuid import UUID

from app.database import get_db, ReliefCenter, ReliefRequest, ReliefRequestStatus, Requester
from app.schemas.relief_centre import (
    ReliefCentreResponse,
    NearestReliefCentreRequest,
    NearestReliefCentreResponse,
    ReliefRequestCreate,
    ReliefRequestResponse,
)
from app.services.relief_centre_service import get_all_relief_centres, find_nearest_relief_centre
from app.models.user import User
from app.dependencies.auth import get_current_user, require_volunteer

router = APIRouter(prefix="/relief-centres", tags=["Relief Centres"])


@router.get("/", response_model=List[ReliefCentreResponse])
def list_relief_centres(db: Session = Depends(get_db)):
    """Public: list all relief centres (for map and nearest lookup)."""
    return get_all_relief_centres(db)


@router.post("/nearest", response_model=NearestReliefCentreResponse)
def nearest_relief_centre(
    request: NearestReliefCentreRequest,
    db: Session = Depends(get_db),
):
    """Public: find nearest relief centre by OSRM routing."""
    try:
        result = find_nearest_relief_centre(db, request.latitude, request.longitude)
        return NearestReliefCentreResponse(
            relief_centre=ReliefCentreResponse(
                id=result["relief_centre"].id,
                name=result["relief_centre"].name,
                latitude=result["relief_centre"].latitude,
                longitude=result["relief_centre"].longitude,
            ),
            route=result["route"],
            distance=result["distance"],
            duration=result["duration"],
            distance_formatted=result["distance_formatted"],
            duration_formatted=result["duration_formatted"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Routing service error: {str(e)}",
        )


@router.post("/requests", response_model=ReliefRequestResponse)
def create_relief_request(body: ReliefRequestCreate, db: Session = Depends(get_db)):
    """
    Public: create a relief request. Requires device_id (from register-device).
    Links request to requester by device_id and to the chosen relief centre.
    """
    requester = db.query(Requester).filter(Requester.device_id == body.device_id).first()
    if not requester:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown device. Please submit your name and phone first (register device).",
        )
    centre = db.query(ReliefCenter).filter(ReliefCenter.id == body.relief_centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Relief centre not found")

    req = ReliefRequest(
        requester_id=requester.id,
        relief_centre_id=centre.id,
        request_type="supplies",
        supplies=body.supplies,
        urgency_level=3,
        latitude=body.latitude,
        longitude=body.longitude,
        status=ReliefRequestStatus.PENDING,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return ReliefRequestResponse(
        id=req.id,
        relief_centre_id=req.relief_centre_id,
        requester_name=requester.full_name,
        requester_phone=requester.phone,
        latitude=req.latitude,
        longitude=req.longitude,
        supplies=body.supplies,
        status=req.status.value,
        created_at=req.created_at.isoformat(),
    )


@router.get("/{centre_id}/requests", response_model=List[ReliefRequestResponse])
def get_requests_for_centre(
    centre_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(require_volunteer),
):
    """Volunteer only: list requests for a given relief centre."""
    centre = db.query(ReliefCenter).filter(ReliefCenter.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Relief centre not found")
    requests = (
        db.query(ReliefRequest)
        .filter(ReliefRequest.relief_centre_id == centre_id)
        .order_by(desc(ReliefRequest.created_at))
        .all()
    )
    return [
        ReliefRequestResponse(
            id=r.id,
            relief_centre_id=r.relief_centre_id,
            requester_name=r.requester.full_name,
            requester_phone=r.requester.phone,
            latitude=r.latitude,
            longitude=r.longitude,
            supplies=r.supplies or [],
            status=r.status.value,
            created_at=r.created_at.isoformat(),
        )
        for r in requests
    ]
