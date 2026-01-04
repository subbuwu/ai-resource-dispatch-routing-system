# Phase 2 & 3 Implementation Summary

## Overview

This document summarizes the complete implementation of Phase 2 (Disaster-Aware Routing) and Phase 3 (Dynamic Real-Time Re-routing) for the Disaster Relief Routing System.

## Architecture

### Backend Structure

```
backend/app/
├── database.py              # PostgreSQL + PostGIS connection
├── main.py                  # FastAPI app with lifespan events
├── models/
│   ├── weather.py          # WeatherData model
│   └── road.py             # RoadCondition & FloodZone models
├── routers/
│   ├── route.py            # Route API (Phase 1 & 2)
│   ├── admin.py            # Admin API (Phase 3)
│   └── websocket.py        # WebSocket endpoint (Phase 3)
├── schemas/
│   ├── route.py            # Route request/response schemas
│   └── admin.py            # Admin API schemas
└── services/
    ├── osrm_service.py      # OSRM integration (extended)
    ├── weather_service.py   # OpenWeatherMap API integration
    ├── flood_service.py     # Flood zone & road condition queries
    ├── risk_service.py      # Risk assessment logic
    └── background_tasks.py  # Scheduled weather refresh
```

### Frontend Structure

```
frontend/app/route/
└── page.tsx                # Route planner with risk visualization
```

## Phase 2: Disaster-Aware Routing

### Database Models

1. **WeatherData** (`app/models/weather.py`)
   - Stores real-time weather from OpenWeatherMap API
   - PostGIS Point geometry for spatial queries
   - Fields: rainfall_intensity, flood_risk_level, temperature, humidity
   - Indexed for performance

2. **RoadCondition** (`app/models/road.py`)
   - Tracks road status (NORMAL, FLOODED, BLOCKED, DAMAGED, CLOSED)
   - PostGIS Geometry (Point or LineString)
   - Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
   - Soft deletion with `is_active` flag

3. **FloodZone** (`app/models/road.py`)
   - Flood-prone areas as PostGIS Polygons
   - Risk levels and water depth tracking
   - Source attribution (GOVERNMENT, OSM, USER_REPORT)

### Services

1. **Weather Service** (`app/services/weather_service.py`)
   - `fetch_weather_data()`: Calls OpenWeatherMap API
   - `store_weather_data()`: Saves to database with PostGIS
   - `calculate_flood_risk()`: Determines risk from rainfall/humidity
   - Real API integration with error handling

2. **Flood Service** (`app/services/flood_service.py`)
   - `check_route_flood_intersection()`: PostGIS ST_Intersects queries
   - `check_route_road_conditions()`: Finds affected roads
   - `calculate_route_risk_score()`: Combines all risk factors

3. **Risk Service** (`app/services/risk_service.py`)
   - `assess_route_risk()`: Comprehensive risk assessment
   - Combines weather, flood zones, and road conditions
   - Returns risk_score (0.0-1.0) and safety_status

### API Endpoints

**POST /route/?assess_risk=true**
- Extends Phase 1 route endpoint
- Returns route with risk_score and safety_status
- Backward compatible (assess_risk=false returns Phase 1 response)

**Response Schema:**
```json
{
  "summary": {...},
  "start": {...},
  "end": {...},
  "geometry": {...},
  "coordinates": [...],
  "risk_score": 0.25,
  "safety_status": "WARNING",
  "risk_details": {
    "flood_zones_affected": 1,
    "road_conditions_affected": 2,
    "weather_risk_levels": ["MEDIUM", "LOW"]
  }
}
```

### Background Tasks

**Weather Refresh** (`app/services/background_tasks.py`)
- Runs every 15 minutes via APScheduler
- Fetches weather for configured locations
- Stores in database for route assessment
- Respects OpenWeatherMap rate limits (60 calls/minute)

## Phase 3: Dynamic Real-Time Re-routing

### Admin API

**Road Conditions:**
- `POST /admin/road-conditions` - Create road condition
- `GET /admin/road-conditions` - List conditions
- `PATCH /admin/road-conditions/{id}` - Update condition
- `DELETE /admin/road-conditions/{id}` - Soft delete

**Flood Zones:**
- `POST /admin/flood-zones` - Create flood zone
- `GET /admin/flood-zones` - List zones

All endpoints accept GeoJSON geometries and convert to PostGIS.

### WebSocket Implementation

**Endpoint:** `ws://localhost:8000/ws/route-updates`

**Connection Manager:**
- Manages active WebSocket connections
- Route-based subscriptions
- Broadcasts updates to subscribers

**Message Format (Client → Server):**
```json
{
  "action": "subscribe",
  "route_id": "route_123",
  "start_lat": 10.6625,
  "start_lng": 76.9921,
  "end_lat": 10.6621,
  "end_lng": 77.0022
}
```

**Message Format (Server → Client):**
```json
{
  "type": "route_update",
  "route_id": "route_123",
  "risk_score": 0.35,
  "safety_status": "WARNING",
  "risk_details": {...},
  "timestamp": 1234567890
}
```

### Alternative Routes

**POST /route/?assess_risk=true&include_alternatives=true**
- Fetches multiple routes from OSRM
- Assesses risk for each alternative
- Sorts by safety (SAFE first) then risk score
- Returns primary route + alternatives

### Route Service Extensions

**`get_route_with_risk_assessment()`**
- Wraps basic OSRM route
- Adds risk assessment via spatial queries
- Optionally includes alternatives

**`get_alternative_routes_with_risk()`**
- Requests alternatives from OSRM
- Evaluates each with risk assessment
- Returns sorted list

## Frontend Implementation

### Risk Visualization

1. **Color-Coded Routes:**
   - Green: SAFE (risk_score < 0.3)
   - Orange: WARNING (0.3 ≤ risk_score < 0.6)
   - Red: UNSAFE (risk_score ≥ 0.6)

2. **Risk Information Display:**
   - Safety status badge
   - Risk score percentage
   - Flood zones affected count
   - Road conditions affected count

3. **Alternative Routes:**
   - Dashed lines for alternatives
   - Same color coding
   - Compare multiple options

### WebSocket Integration

1. **Connection Management:**
   - Auto-connects on page load
   - Reconnects on disconnect
   - Heartbeat (ping/pong)

2. **Real-Time Updates:**
   - Subscribes to route on calculation
   - Receives risk updates automatically
   - Updates UI without page refresh
   - Shows "Live Updates" indicator

3. **Route Recalculation:**
   - Triggered by WebSocket messages
   - Updates risk score and safety status
   - Maintains route geometry

## Risk Scoring Algorithm

### Components

1. **Flood Zone Penalties:**
   - CRITICAL: +0.4
   - HIGH: +0.3
   - MEDIUM: +0.15
   - LOW: +0.05

2. **Road Condition Penalties:**
   - BLOCKED/CLOSED: +0.5
   - FLOODED (CRITICAL): +0.4
   - FLOODED (HIGH): +0.3
   - FLOODED (other): +0.2
   - DAMAGED: +0.15

3. **Weather Risk Penalties:**
   - HIGH: +0.2
   - MEDIUM: +0.1
   - LOW: +0.02
   - Averaged across route

### Safety Classification

- **SAFE**: risk_score < 0.3
- **WARNING**: 0.3 ≤ risk_score < 0.6
- **UNSAFE**: risk_score ≥ 0.6

## Spatial Queries (PostGIS)

### Flood Zone Intersection

```sql
SELECT * FROM flood_zones
WHERE ST_Intersects(
    boundary,
    ST_SetSRID(ST_GeomFromText('LINESTRING(...)'), 4326)
)
AND is_active = true
```

### Road Condition Proximity

```sql
SELECT * FROM road_conditions
WHERE ST_DWithin(
    geometry::geography,
    ST_SetSRID(ST_GeomFromText('LINESTRING(...)'), 4326)::geography,
    50  -- 50 meters
)
AND is_active = true
```

### Weather Data Proximity

```sql
SELECT * FROM weather_data
WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    5000  -- 5km radius
)
ORDER BY fetched_at DESC
LIMIT 1
```

## External API Integration

### OpenWeatherMap API

**Endpoint:** `https://api.openweathermap.org/data/2.5/weather`

**Usage:**
- Free tier: 60 calls/minute, 1M calls/month
- Fetches: temperature, humidity, rainfall, visibility
- Calculates flood risk from rainfall intensity

**Error Handling:**
- Timeout: 10 seconds
- Rate limiting: 15-minute refresh interval
- Graceful degradation: Falls back to LOW risk if API fails

## Database Schema

### Tables

1. **weather_data**
   - Primary key: `id`
   - Spatial index: `location` (GIST)
   - Indexes: `fetched_at`, `flood_risk_level`

2. **road_conditions**
   - Primary key: `id`
   - Spatial index: `geometry` (GIST)
   - Indexes: `status`, `is_active`

3. **flood_zones**
   - Primary key: `id`
   - Spatial index: `boundary` (GIST)
   - Indexes: `flood_risk_level`, `is_active`

## Key Features

### Backward Compatibility

- Phase 1 endpoints remain functional
- `assess_risk=false` returns basic route
- No breaking changes to existing API

### Real-Time Updates

- WebSocket for live route updates
- Automatic risk recalculation
- No polling required

### Scalability

- Database indexes for performance
- Connection pooling
- Background task scheduling
- WebSocket connection management

### Error Handling

- API failures gracefully handled
- Database transaction rollback
- WebSocket reconnection logic
- User-friendly error messages

## Testing Checklist

- [ ] Basic route calculation (Phase 1)
- [ ] Risk-aware route (Phase 2)
- [ ] Alternative routes (Phase 3)
- [ ] Weather data refresh
- [ ] Road condition creation
- [ ] Flood zone creation
- [ ] WebSocket connection
- [ ] Real-time route updates
- [ ] Spatial queries
- [ ] Error handling

## Production Considerations

1. **Authentication**: Add JWT to admin endpoints
2. **Rate Limiting**: Implement for API protection
3. **Caching**: Cache weather data (Redis)
4. **Monitoring**: Logging and metrics
5. **Scaling**: Redis for WebSocket management
6. **Security**: Input validation, SQL injection prevention
7. **Backup**: Database backup strategy
8. **Documentation**: API documentation (Swagger)

## Files Created/Modified

### Backend
- `app/database.py` (NEW)
- `app/models/weather.py` (NEW)
- `app/models/road.py` (NEW)
- `app/services/weather_service.py` (NEW)
- `app/services/flood_service.py` (NEW)
- `app/services/risk_service.py` (NEW)
- `app/services/background_tasks.py` (NEW)
- `app/services/osrm_service.py` (MODIFIED)
- `app/schemas/route.py` (MODIFIED)
- `app/schemas/admin.py` (NEW)
- `app/routers/route.py` (MODIFIED)
- `app/routers/admin.py` (NEW)
- `app/routers/websocket.py` (NEW)
- `app/main.py` (MODIFIED)
- `requirements.txt` (MODIFIED)

### Frontend
- `app/route/page.tsx` (MODIFIED)

### Documentation
- `PHASE2_PHASE3_SETUP.md` (NEW)
- `IMPLEMENTATION_SUMMARY.md` (NEW)

## Next Steps

1. Set up PostgreSQL + PostGIS
2. Configure environment variables
3. Install dependencies
4. Initialize database
5. Start OSRM server
6. Start backend
7. Start frontend
8. Test endpoints
9. Create sample data (road conditions, flood zones)
10. Monitor weather refresh task

