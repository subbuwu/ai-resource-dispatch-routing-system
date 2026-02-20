"""
Admin only: CRUD relief centres (for map integration and OSRM).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db, ReliefCenter
from app.schemas.relief_centre import ReliefCentreResponse, ReliefCentreCreate
from app.models.user import User
from app.dependencies.auth import get_current_user, require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/relief-centres", response_model=List[ReliefCentreResponse])
def admin_list_relief_centres(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all relief centres."""
    return db.query(ReliefCenter).all()


@router.post("/relief-centres", response_model=ReliefCentreResponse, status_code=201)
def admin_create_relief_centre(
    body: ReliefCentreCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Create a new relief centre (e.g. from admin map)."""
    centre = ReliefCenter(
        name=body.name,
        latitude=body.latitude,
        longitude=body.longitude,
    )
    db.add(centre)
    db.commit()
    db.refresh(centre)
    return centre


@router.put("/relief-centres/{centre_id}", response_model=ReliefCentreResponse)
def admin_update_relief_centre(
    centre_id: UUID,
    body: ReliefCentreCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Update a relief centre."""
    centre = db.query(ReliefCenter).filter(ReliefCenter.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Relief centre not found")
    centre.name = body.name
    centre.latitude = body.latitude
    centre.longitude = body.longitude
    db.commit()
    db.refresh(centre)
    return centre


@router.delete("/relief-centres/{centre_id}", status_code=204)
def admin_delete_relief_centre(
    centre_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Delete a relief centre."""
    centre = db.query(ReliefCenter).filter(ReliefCenter.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Relief centre not found")
    db.delete(centre)
    db.commit()
    return None
