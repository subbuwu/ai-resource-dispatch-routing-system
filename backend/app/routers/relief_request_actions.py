"""
Volunteer actions on relief requests: accept, status, location.
Victim tracking: get request status + volunteer location + ETA.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db, ReliefRequest, ReliefRequestStatus, Requester, Dispatch, DispatchStatus, User
from app.dependencies.auth import get_current_user, require_volunteer
from app.schemas.relief_centre import RequestStatusUpdate, DispatchLocationUpdate, TrackingResponse
from app.services.osrm_service import get_route

router = APIRouter(prefix="/relief-requests", tags=["Relief Request Actions"])


@router.get("/my-active")
def my_active_dispatch(
    db: Session = Depends(get_db),
    user: User = Depends(require_volunteer),
):
    """Volunteer: get my active dispatch (if any) so UI can show Navigate/Complete."""
    d = (
        db.query(Dispatch)
        .filter(
            Dispatch.volunteer_id == user.id,
            Dispatch.status.in_([DispatchStatus.ASSIGNED, DispatchStatus.IN_PROGRESS]),
        )
        .first()
    )
    if not d:
        return {"request_id": None, "dispatch_id": None}
    return {"request_id": str(d.request_id), "dispatch_id": str(d.id)}


def _get_dispatch_for_volunteer(db: Session, request_id: UUID, user: User):
    """Return dispatch if this volunteer owns it."""
    d = (
        db.query(Dispatch)
        .filter(Dispatch.request_id == request_id, Dispatch.volunteer_id == user.id)
        .first()
    )
    return d


@router.post("/{request_id}/accept")
def accept_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_volunteer),
):
    """Volunteer accepts a request: creates dispatch, sets request status to ACCEPTED."""
    req = db.query(ReliefRequest).filter(ReliefRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != ReliefRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request is no longer pending",
        )
    existing = db.query(Dispatch).filter(Dispatch.request_id == request_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request already accepted by a volunteer",
        )
    dispatch = Dispatch(
        request_id=req.id,
        volunteer_id=user.id,
        status=DispatchStatus.ASSIGNED,
    )
    db.add(dispatch)
    req.status = ReliefRequestStatus.ACCEPTED
    db.commit()
    db.refresh(dispatch)
    return {"ok": True, "dispatch_id": str(dispatch.id), "request_id": str(req.id)}


@router.patch("/{request_id}/status")
def update_request_status(
    request_id: UUID,
    body: RequestStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_volunteer),
):
    """Volunteer (owner) updates request status: IN_PROGRESS or COMPLETED."""
    dispatch = _get_dispatch_for_volunteer(db, request_id, user)
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    req = dispatch.request
    if body.status not in ("IN_PROGRESS", "COMPLETED"):
        raise HTTPException(status_code=400, detail="Invalid status")
    req.status = ReliefRequestStatus(body.status)
    if body.status == "IN_PROGRESS":
        dispatch.status = DispatchStatus.IN_PROGRESS
    elif body.status == "COMPLETED":
        dispatch.status = DispatchStatus.COMPLETED
    db.commit()
    return {"ok": True, "status": body.status}


@router.get("/{request_id}/tracking", response_model=TrackingResponse)
def get_tracking(
    request_id: UUID,
    device_id: str = Query(..., description="Requester device_id to authorize"),
    db: Session = Depends(get_db),
):
    """Victim: get request status, volunteer location, route from volunteer to victim, ETA."""
    requester = db.query(Requester).filter(Requester.device_id == device_id).first()
    if not requester:
        raise HTTPException(status_code=400, detail="Invalid device_id")
    req = db.query(ReliefRequest).filter(ReliefRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.requester_id != requester.id:
        raise HTTPException(status_code=403, detail="Not your request")

    status_val = req.status.value if hasattr(req.status, "value") else str(req.status)
    out = TrackingResponse(
        request_id=req.id,
        status=status_val,
        requester_name=requester.full_name,
        requester_phone=requester.phone,
        victim_latitude=req.latitude,
        victim_longitude=req.longitude,
        relief_centre_id=req.relief_centre_id,
        relief_centre_name=req.relief_centre.name if req.relief_centre else None,
        volunteer_name=None,
        volunteer_latitude=None,
        volunteer_longitude=None,
        location_updated_at=None,
        route_to_victim=None,
        eta_minutes=None,
    )

    dispatch = db.query(Dispatch).filter(Dispatch.request_id == request_id).first()
    if not dispatch:
        return out

    out.volunteer_name = dispatch.volunteer.name if dispatch.volunteer else None
    out.volunteer_latitude = dispatch.volunteer_latitude
    out.volunteer_longitude = dispatch.volunteer_longitude
    if dispatch.location_updated_at:
        out.location_updated_at = dispatch.location_updated_at.isoformat()

    if dispatch.volunteer_latitude is not None and dispatch.volunteer_longitude is not None:
        try:
            route = get_route(
                dispatch.volunteer_latitude,
                dispatch.volunteer_longitude,
                req.latitude,
                req.longitude,
            )
            out.route_to_victim = route
            out.eta_minutes = route["summary"]["duration"] / 60.0
        except Exception:
            pass

    return out


# Dispatches: volunteer location update (volunteer must own the dispatch)
@router.post("/dispatches/{dispatch_id}/location")
def update_volunteer_location(
    dispatch_id: UUID,
    body: DispatchLocationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_volunteer),
):
    """Volunteer sends current GPS for live tracking."""
    from datetime import datetime
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    if dispatch.volunteer_id != user.id:
        raise HTTPException(status_code=403, detail="Not your dispatch")
    dispatch.volunteer_latitude = body.latitude
    dispatch.volunteer_longitude = body.longitude
    dispatch.location_updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}
