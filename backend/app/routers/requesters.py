"""
Public API for requesters (victims): register by device_id, no login.
"""
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, Requester
from app.schemas.requester import RegisterDeviceRequest, RegisterDeviceResponse

router = APIRouter(prefix="/requesters", tags=["Requesters"])


@router.post("/register-device", response_model=RegisterDeviceResponse)
def register_device(body: RegisterDeviceRequest, db: Session = Depends(get_db)):
    """
    Register or update requester by device_id.
    - If device_id is provided and exists: update name/phone and return same device_id.
    - If device_id is provided but not found: create new requester with that device_id.
    - If device_id is omitted: generate new UUID, create requester, return new device_id.
    """
    device_id = body.device_id
    if not device_id:
        device_id = str(uuid_lib.uuid4())

    existing = db.query(Requester).filter(Requester.device_id == device_id).first()
    if existing:
        existing.full_name = body.full_name
        existing.phone = body.phone
        db.commit()
        db.refresh(existing)
        return RegisterDeviceResponse(
            device_id=existing.device_id,
            full_name=existing.full_name,
            phone=existing.phone,
        )

    requester = Requester(
        device_id=device_id,
        full_name=body.full_name,
        phone=body.phone,
    )
    db.add(requester)
    db.commit()
    db.refresh(requester)
    return RegisterDeviceResponse(
        device_id=requester.device_id,
        full_name=requester.full_name,
        phone=requester.phone,
    )
