# Relief Centres Feature Setup

This guide explains how to set up and use the relief centre feature.

## Overview

The relief centre feature allows users to:
- View all active relief centres on the map
- Automatically find the nearest relief centre based on their location
- Get routing directions to the nearest relief centre

## Database Setup

The system uses SQLite (lightweight, no external setup required). The database file `relief_centres.db` will be created automatically in the backend directory.

## Seeding Sample Data

To populate the database with sample relief centres:

```bash
cd backend
source venv/bin/activate
python seed_relief_centres.py
```

This will create 7 sample relief centres in the Guduvancherry, Maraimalai Nagar, Potheri area (Chengalpattu district, Tamil Nadu).

## API Endpoints

### GET /relief-centres
Returns all active relief centres.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Guduvancherry Central Relief Centre",
    "latitude": 12.6939,
    "longitude": 79.9757,
    "capacity": 500,
    "status": "active"
  }
]
```

### POST /relief-centres/nearest
Finds the nearest relief centre to user location.

**Request:**
```json
{
  "latitude": 12.6939,
  "longitude": 79.9757
}
```

**Response:**
```json
{
  "relief_centre": {
    "id": 1,
    "name": "Guduvancherry Central Relief Centre",
    "latitude": 12.6939,
    "longitude": 79.9757,
    "capacity": 500,
    "status": "active"
  },
  "route": {
    "summary": {...},
    "geometry": {...},
    "coordinates": [...]
  },
  "distance": 1732.1,
  "duration": 178.9,
  "distance_formatted": "1.7 km",
  "duration_formatted": "3 min"
}
```

## Frontend Features

1. **Automatic Detection**: When user location is available, the system automatically finds and routes to the nearest relief centre.

2. **Map Markers**:
   - Green marker: User location
   - Blue markers: All relief centres
   - Orange marker (highlighted): Nearest relief centre

3. **Info Panel**: Shows relief centre name, distance, travel time, and capacity.

4. **Manual Override**: Users can still click on the map to set a custom destination.

## Adding Relief Centres

You can add relief centres programmatically or via API (if you add a POST endpoint):

```python
from app.database import SessionLocal, ReliefCentre, ReliefCentreStatus

db = SessionLocal()
centre = ReliefCentre(
    name="New Relief Centre",
    latitude=12.8000,
    longitude=80.0000,
    capacity=300,
    status=ReliefCentreStatus.ACTIVE
)
db.add(centre)
db.commit()
```

## Routing Logic

The nearest relief centre is determined by:

1. **Haversine Distance**: Initial filtering using approximate distance (fast)
2. **OSRM Routing**: Accurate travel distance/time for top 5 candidates
3. **Selection**: Chooses the centre with shortest travel distance

This approach balances accuracy with performance, avoiding OSRM calls for all centres.

## Error Handling

- If no relief centres exist: Returns 404
- If OSRM is unavailable: Returns 503 with error message
- If geolocation fails: Falls back to default location (Guduvancherry area)

## Testing

1. Start the backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

2. Seed relief centres:
   ```bash
   python seed_relief_centres.py
   ```

3. Test API:
   ```bash
   # Get all centres
   curl http://localhost:8000/relief-centres/
   
   # Find nearest
   curl -X POST http://localhost:8000/relief-centres/nearest \
     -H "Content-Type: application/json" \
     -d '{"latitude": 12.6939, "longitude": 79.9757}'
   ```

4. Open frontend: `http://localhost:3000/route`
   - Allow location access
   - Nearest relief centre will be automatically detected and routed

