# Quick Setup Guide

## Prerequisites
- Python 3.13+
- Node.js 18+ and Bun (or npm)
- OSRM installed (`brew install osrm-backend` on macOS)

## Backend Setup (5 minutes)

### 1. Start OSRM Server
```bash
cd backend
osrm-routed --algorithm mld osrm/map.osrm
```
✅ OSRM running on `http://localhost:5000`

### 2. Setup Python Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start FastAPI Backend
```bash
uvicorn app.main:app --reload --port 8000
```
✅ API available at `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Frontend Setup (2 minutes)

```bash
cd frontend
bun install  # or npm install
bun dev      # or npm run dev
```
✅ Frontend at `http://localhost:3000`

## Verify Installation

### Test Backend
```bash
curl http://localhost:8000/health
# Expected: {"status":"Backend running"}
```

### Test Route API
```bash
curl -X POST http://localhost:8000/route/ \
  -H "Content-Type: application/json" \
  -d '{"start_lat":40.7128,"start_lng":-74.0060,"end_lat":40.7589,"end_lng":-73.9851}'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| OSRM port in use | Use `--port 5001` or stop conflicting service |
| Backend can't connect to OSRM | Ensure OSRM is running first |
| Python import errors | Activate venv: `source venv/bin/activate` |
| Frontend build errors | Run `bun install` or check Node.js version |

## Service Ports

- **OSRM**: `localhost:5000`
- **FastAPI Backend**: `localhost:8000`
- **Next.js Frontend**: `localhost:3000`

## Next Steps

See [README.md](./README.md) for:
- Detailed API documentation
- Processing new map data
- Architecture overview
- Advanced configuration

