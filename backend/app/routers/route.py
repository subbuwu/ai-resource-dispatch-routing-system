from fastapi import APIRouter
from app.schemas.route import RouteRequest, RouteResponse
from app.services.osrm_service import get_route

router = APIRouter(prefix="/route", tags=["Routing"])

@router.post("/", response_model=RouteResponse)
def compute_route(request: RouteRequest):
    return get_route(
        request.start_lat,
        request.start_lng,
        request.end_lat,
        request.end_lng
    )
