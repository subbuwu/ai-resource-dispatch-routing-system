# Complete OSRM Setup Guide - From Scratch

This guide will walk you through setting up OSRM (Open Source Routing Machine) from scratch, including downloading map data, processing it, and running it with Docker.

## 📋 Prerequisites

Before starting, ensure you have:
- **Docker** installed and running ([Download Docker](https://www.docker.com/get-started))
- **Python 3.13+** installed
- **Node.js 18+** and **Bun** (or npm/yarn) installed
- **Git** installed

## 🗺️ Step 1: Choose Your Map Region

First, decide which geographic region you need routing for. You can download OpenStreetMap data from:

- **Geofabrik** (Recommended): https://download.geofabrik.de/
  - Provides pre-extracted regions (countries, states, cities)
  - Faster downloads
  - Example: India → https://download.geofabrik.de/asia/india-latest.osm.pbf

- **Planet OSM**: https://planet.openstreetmap.org/
  - Full planet data (very large, ~70GB+)
  - Only use if you need global coverage

### Recommended Regions:
- **India**: `india-latest.osm.pbf` (~1.5GB)
- **Kerala (India)**: `kerala-latest.osm.pbf` (~50MB)
- **Tamil Nadu (India)**: `tamil-nadu-latest.osm.pbf` (~100MB)
- **Coimbatore (India)**: Download from Geofabrik's city extracts

## 📥 Step 2: Download OSM Map Data

### Option A: Download via Browser
1. Visit https://download.geofabrik.de/
2. Navigate to your region (e.g., Asia → India)
3. Download the `.osm.pbf` file
4. Save it to `backend/osrm/` directory

### Option B: Download via Command Line

```bash
# Navigate to backend directory
cd backend

# Create osrm directory if it doesn't exist
mkdir -p osrm

# Download map data (example: Kerala, India - smaller file for testing)
cd osrm
wget https://download.geofabrik.de/asia/india/kerala-latest.osm.pbf

# Or for full India (larger file, ~1.5GB)
# wget https://download.geofabrik.de/asia/india-latest.osm.pbf

# Or for a specific city (example: Coimbatore)
# Visit Geofabrik and find the direct download link
```

**Note**: For testing, start with a smaller region (like a state or city) as processing is faster.

## 🐳 Step 3: Process Map Data with Docker

OSRM requires processing the `.osm.pbf` file into routing data. We'll use Docker to do this.

### 3.1 Extract Road Network

```bash
# Make sure you're in the backend directory
cd backend

# Run OSRM extract (this may take 10-30 minutes depending on map size)
docker run --rm \
  -v $(pwd)/osrm:/data \
  --platform linux/amd64 \
  osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/map.osm.pbf

# Note: If your file has a different name, replace 'map.osm.pbf' with your filename
# Example: osrm-extract -p /opt/car.lua /data/kerala-latest.osm.pbf
```

**What this does:**
- Extracts road network data from the OSM file
- Creates `map.osrm` file (or `kerala-latest.osrm` if using that filename)
- Takes 10-30 minutes for state-level maps, 1-3 hours for country-level

### 3.2 Partition the Map (for MLD algorithm)

```bash
# Partition the extracted data
docker run --rm \
  -v $(pwd)/osrm:/data \
  --platform linux/amd64 \
  osrm/osrm-backend \
  osrm-partition /data/map.osrm

# Again, replace 'map.osrm' with your actual .osrm filename if different
```

**What this does:**
- Partitions the graph for Multi-Level Dijkstra (MLD) algorithm
- Creates partition files (`.osrm.partition`, etc.)
- Takes 5-15 minutes

### 3.3 Customize the Map

```bash
# Customize the partitioned data
docker run --rm \
  -v $(pwd)/osrm:/data \
  --platform linux/amd64 \
  osrm/osrm-backend \
  osrm-customize /data/map.osrm
```

**What this does:**
- Finalizes the routing graph
- Creates customization files (`.osrm.mld`, etc.)
- Takes 5-15 minutes

### 3.4 Verify Processing

After processing, you should see multiple `.osrm.*` files:

```bash
ls -lh backend/osrm/
```

You should see files like:
- `map.osrm` (or your filename)
- `map.osrm.cells`
- `map.osrm.cnbg`
- `map.osrm.ebg`
- `map.osrm.geometry`
- `map.osrm.mld`
- `map.osrm.partition`
- And many more...

**Total size**: Usually 2-3x the original `.osm.pbf` file size.

## 🚀 Step 4: Start OSRM Server with Docker

Once processing is complete, start the OSRM routing server:

```bash
# Make sure you're in the backend directory
cd backend

# Start OSRM server (maps port 4000 on host to 5000 in container)
docker run --rm -d \
  -p 4000:5000 \
  -v $(pwd)/osrm:/data \
  --platform linux/amd64 \
  --name osrm-server \
  osrm/osrm-backend \
  osrm-routed --algorithm mld /data/map.osrm
```

**Important Notes:**
- Replace `map.osrm` with your actual `.osrm` filename if different
- The server runs on port **4000** on your host machine
- Use `--algorithm mld` for Multi-Level Dijkstra (recommended for large maps)
- Use `--algorithm ch` for Contraction Hierarchies (faster for small maps)

### Verify OSRM is Running

```bash
# Check if container is running
docker ps | grep osrm

# Test OSRM API
curl "http://localhost:4000/route/v1/driving/76.9921,10.6625;77.0022,10.6621?overview=full&geometries=geojson"
```

You should get a JSON response with route data.

### Stop OSRM Server

```bash
# Stop the container
docker stop osrm-server
```

## 🔧 Step 5: Configure Backend

### 5.1 Verify OSRM URL in Backend

Check that the backend is configured to use the correct OSRM URL:

```bash
# Check the OSRM service configuration
cat backend/app/services/osrm_service.py | grep OSRM_BASE_URL
```

It should show:
```python
OSRM_BASE_URL = "http://localhost:4000"
```

If it shows port 5000, update it:
```python
OSRM_BASE_URL = "http://localhost:4000"  # Match Docker port mapping
```

### 5.2 Set Up Python Environment

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 5.3 Start FastAPI Backend

```bash
# Make sure virtual environment is activated
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 🎨 Step 6: Set Up Frontend

```bash
cd frontend

# Install dependencies
bun install  # or npm install

# Start development server
bun dev  # or npm run dev
```

Frontend will be available at: http://localhost:3000

## ✅ Step 7: Verify Everything Works

### Test Backend Health
```bash
curl http://localhost:8000/health
# Expected: {"status":"Backend running"}
```

### Test Route API
```bash
curl -X POST http://localhost:8000/route/ \
  -H "Content-Type: application/json" \
  -d '{
    "start_lat": 10.6625,
    "start_lng": 76.9921,
    "end_lat": 10.6621,
    "end_lng": 77.0022
  }'
```

### Test Frontend
1. Open http://localhost:3000/route
2. Allow location access
3. Click on map to set destination
4. Route should appear automatically

## 🔄 Quick Reference: Complete Setup Commands

For a fresh clone, run these commands in order:

```bash
# 1. Download map data (choose your region)
cd backend/osrm
wget https://download.geofabrik.de/asia/india/kerala-latest.osm.pbf
mv kerala-latest.osm.pbf map.osm.pbf  # Rename for convenience
cd ../..

# 2. Process map data
cd backend
docker run --rm -v $(pwd)/osrm:/data --platform linux/amd64 osrm/osrm-backend osrm-extract -p /opt/car.lua /data/map.osm.pbf
docker run --rm -v $(pwd)/osrm:/data --platform linux/amd64 osrm/osrm-backend osrm-partition /data/map.osrm
docker run --rm -v $(pwd)/osrm:/data --platform linux/amd64 osrm/osrm-backend osrm-customize /data/map.osrm

# 3. Start OSRM server
docker run --rm -d -p 4000:5000 -v $(pwd)/osrm:/data --platform linux/amd64 --name osrm-server osrm/osrm-backend osrm-routed --algorithm mld /data/map.osrm

# 4. Set up Python backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 5. Set up frontend (in new terminal)
cd frontend
bun install
bun dev
```

## 🐛 Troubleshooting

### Issue: Docker command fails with "platform" error
**Solution**: Remove `--platform linux/amd64` if you're on an ARM Mac (M1/M2/M3):
```bash
docker run --rm -v $(pwd)/osrm:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/map.osm.pbf
```

### Issue: OSRM processing takes too long
**Solution**: 
- Use a smaller region (city or state instead of country)
- Processing time scales with map size
- Kerala (~50MB) takes ~15-20 minutes
- Full India (~1.5GB) takes 2-4 hours

### Issue: Port 4000 already in use
**Solution**: Change the port mapping:
```bash
docker run --rm -d -p 5001:5000 ...  # Use port 5001 instead
# Then update backend/app/services/osrm_service.py to use port 5001
```

### Issue: "Cannot connect to OSRM"
**Solution**:
1. Verify OSRM container is running: `docker ps | grep osrm`
2. Test OSRM directly: `curl http://localhost:4000/route/v1/driving/...`
3. Check backend OSRM_BASE_URL matches Docker port

### Issue: Map file not found
**Solution**: 
- Ensure you're in the `backend` directory when running Docker commands
- Check file exists: `ls -lh backend/osrm/*.osm.pbf`
- Use full path or correct relative path in Docker command

### Issue: Out of disk space
**Solution**:
- Processed files are 2-3x larger than `.osm.pbf`
- For India (1.5GB), you need ~4-5GB free space
- Use smaller regions for testing

## 📊 File Size Estimates

| Region | PBF Size | Processed Size | Processing Time |
|--------|----------|----------------|-----------------|
| City (Coimbatore) | ~10-20 MB | ~30-60 MB | 5-10 min |
| State (Kerala) | ~50 MB | ~150 MB | 15-20 min |
| State (Tamil Nadu) | ~100 MB | ~300 MB | 20-30 min |
| Country (India) | ~1.5 GB | ~4-5 GB | 2-4 hours |
| Full Planet | ~70 GB | ~200 GB | 10-20 hours |

## 🎯 Recommended Workflow

1. **Start Small**: Use a city or small state for initial testing
2. **Test Everything**: Verify OSRM, backend, and frontend work
3. **Scale Up**: Process larger regions if needed
4. **Keep Processed Files**: Don't delete `.osrm.*` files (they're expensive to regenerate)

## 📝 Notes

- **Don't commit OSRM files**: They're already in `.gitignore`
- **Keep original `.osm.pbf`**: You may need to reprocess
- **Docker is required**: OSRM processing requires Docker
- **Processing is one-time**: Once processed, just start the server
- **Port 4000**: Backend expects OSRM on port 4000 (Docker maps 4000→5000)

## 🔗 Useful Links

- **Geofabrik Downloads**: https://download.geofabrik.de/
- **OSRM Docker Hub**: https://hub.docker.com/r/osrm/osrm-backend/
- **OSRM Documentation**: http://project-osrm.org/
- **OpenStreetMap**: https://www.openstreetmap.org/

---

**Need Help?** Check the main [README.md](./README.md) or [SETUP.md](./SETUP.md) for more information.

