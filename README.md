# AI Resource Dispatch & Routing System

A disaster relief routing system that computes the **safest and shortest routes** for emergency vehicles by combining real road network routing with disaster-specific road condition data using open-source technologies.

## 🎯 Overview

This system provides intelligent routing capabilities for disaster relief operations, enabling emergency responders to:
- Compute optimal routes using real road network data
- Avoid damaged or blocked roads during disasters
- Get accurate distance and duration estimates
- Access route geometry for visualization

## 🏗️ Architecture

The system consists of three main components:

1. **Backend API** (FastAPI) - Coordinates routing requests and integrates with OSRM
2. **OSRM Server** - High-performance routing engine using OpenStreetMap data
3. **Frontend** (Next.js) - Web interface for route visualization and interaction

### Technology Stack

- **Backend**: FastAPI, Python 3.13+
- **Routing Engine**: OSRM (Open Source Routing Machine)
- **Map Data**: OpenStreetMap (OSM)
- **Frontend**: Next.js 16, React 19, TypeScript
- **API Communication**: RESTful API

## 📋 Prerequisites

Before setting up the system, ensure you have:

- **Python 3.13+** installed
- **Node.js 18+** and **Bun** (or npm/yarn) installed
- **OSRM** installed and configured (see setup guide below)
- **Docker** (optional, for easier OSRM setup)

## 🚀 Quick Start Guide

### 1. Backend Setup with OSRM

#### Option A: Using Pre-processed Map Data (Recommended)

The project includes pre-processed OSRM map data in `backend/osrm/`. Follow these steps:

1. **Install OSRM**:
   ```bash
   # macOS
   brew install osrm-backend
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install osrm-backend
   
   # Or build from source: https://github.com/Project-OSRM/osrm-backend
   ```

2. **Start OSRM Server**:
   ```bash
   cd backend
   osrm-routed --algorithm mld osrm/map.osrm
   ```
   
   The server will start on `http://localhost:5000`

3. **Set up Python Environment**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Start FastAPI Backend**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   
   The API will be available at `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/health`

#### Option B: Download and Process New Map Data

If you need to process a new map region:

1. **Download OSM Data**:
   ```bash
   # Download from Geofabrik or other OSM providers
   wget https://download.geofabrik.de/[region]-latest.osm.pbf
   ```

2. **Extract Road Network**:
   ```bash
   osrm-extract -p /usr/local/share/osrm/profiles/car.lua map.osm.pbf
   ```

3. **Partition and Customize**:
   ```bash
   osrm-partition map.osrm
   osrm-customize map.osrm
   ```

4. **Start OSRM Server**:
   ```bash
   osrm-routed --algorithm mld map.osrm
   ```

### 2. Frontend Setup

1. **Install Dependencies**:
   ```bash
   cd frontend
   bun install  # or npm install / yarn install
   ```

2. **Start Development Server**:
   ```bash
   bun dev  # or npm run dev
   ```
   
   The frontend will be available at `http://localhost:3000`

## 📡 API Documentation

### Endpoints

#### Health Check
```
GET /health
```
Returns the status of the backend service.

**Response:**
```json
{
  "status": "Backend running"
}
```

#### Compute Route
```
POST /route/
```
Computes the optimal route between two coordinates.

**Request Body:**
```json
{
  "start_lat": 40.7128,
  "start_lng": -74.0060,
  "end_lat": 40.7589,
  "end_lng": -73.9851
}
```

**Response:**
```json
{
  "distance": 1234.56,
  "duration": 234.5,
  "geometry": [
    [-74.0060, 40.7128],
    [-74.0050, 40.7130],
    ...
  ]
}
```

**Response Fields:**
- `distance`: Total route distance in meters
- `duration`: Estimated travel time in seconds
- `geometry`: Array of [longitude, latitude] coordinate pairs representing the route path

### Interactive API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔧 Configuration

### Backend Configuration

The OSRM service URL can be configured in `backend/app/services/osrm_service.py`:

```python
OSRM_BASE_URL = "http://localhost:5000"  # Change if OSRM runs on different host/port
```

### OSRM Configuration

OSRM server options:
- `--algorithm mld`: Multi-Level Dijkstra (recommended for large maps)
- `--algorithm ch`: Contraction Hierarchies (faster for smaller maps)
- `--port 5000`: Specify custom port (default: 5000)

## 📁 Project Structure

```
ai-resource-dispatch-routing-system/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── routers/
│   │   │   └── route.py         # Route API endpoints
│   │   ├── schemas/
│   │   │   └── route.py          # Pydantic models for request/response
│   │   └── services/
│   │       └── osrm_service.py   # OSRM integration service
│   ├── osrm/                     # Pre-processed OSRM map data
│   ├── requirements.txt          # Python dependencies
│   └── venv/                     # Python virtual environment
├── frontend/
│   ├── app/                      # Next.js app directory
│   ├── package.json              # Node.js dependencies
│   └── ...
└── README.md                     # This file
```

## 🧪 Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:8000/health

# Compute route
curl -X POST http://localhost:8000/route/ \
  -H "Content-Type: application/json" \
  -d '{
    "start_lat": 40.7128,
    "start_lng": -74.0060,
    "end_lat": 40.7589,
    "end_lng": -73.9851
  }'
```

### Using Python

```python
import requests

response = requests.post(
    "http://localhost:8000/route/",
    json={
        "start_lat": 40.7128,
        "start_lng": -74.0060,
        "end_lat": 40.7589,
        "end_lng": -73.9851
    }
)
print(response.json())
```

## 🐛 Troubleshooting

### OSRM Server Issues

- **Port already in use**: Change the port with `--port` flag or stop the conflicting service
- **Map file not found**: Ensure the `.osrm` file exists in the specified path
- **Permission denied**: Check file permissions on the map data directory

### Backend Issues

- **Connection refused to OSRM**: Ensure OSRM server is running on `localhost:5000`
- **Import errors**: Activate the virtual environment and ensure all dependencies are installed
- **Port conflicts**: Change the uvicorn port with `--port` flag

### Frontend Issues

- **Module not found**: Run `bun install` (or `npm install`) to install dependencies
- **Build errors**: Check Node.js version compatibility (requires 18+)

## 🔮 Future Enhancements

- Integration with disaster intelligence data (PostGIS)
- Real-time road condition updates
- Multi-vehicle routing optimization
- Route caching and optimization
- Authentication and rate limiting
- WebSocket support for real-time updates

## 📝 License

This project uses open-source technologies and is designed to be fully extensible.

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows existing style conventions
- Tests are added for new features
- Documentation is updated accordingly

## 📚 Additional Resources

- [OSRM Documentation](https://github.com/Project-OSRM/osrm-backend/wiki)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenStreetMap](https://www.openstreetmap.org/)
