"""
Schemas for requester (victim) device registration - no auth.
"""
from pydantic import BaseModel
from uuid import UUID


class RegisterDeviceRequest(BaseModel):
    """First-time or update: full name and phone. device_id optional (client can send existing)."""
    full_name: str
    phone: str
    device_id: str | None = None  # If omitted, server generates and returns new one


class RegisterDeviceResponse(BaseModel):
    """Returned after register: use this device_id in localStorage and for future requests."""
    device_id: str
    full_name: str
    phone: str
