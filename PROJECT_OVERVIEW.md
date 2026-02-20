# AI Resource Dispatch & Routing System — Project Overview & Technical Reference

**Document purpose:** Whole-project context, technology stack, algorithms, and structured notes for an IEEE-style research paper.

---

## 1. Project Context & Overview

### 1.1 Problem Statement

Disaster relief operations require **timely allocation of resources** and **safe, efficient routing** for both affected individuals (victims) and volunteers. Challenges include:

- Identifying the **nearest relief centre** by **travel distance/time** (not straight-line).
- Providing **turn-by-turn routing** on real road networks (OpenStreetMap).
- Enabling **victims** to request help **without creating accounts** (low friction).
- Letting **volunteers** accept requests and **share live location** so victims can track ETA.
- Incorporating **weather and safety** context along routes and at locations.

### 1.2 System Goals

- **Victims:** Request supplies from a map, provide name/phone once (device-bound), get nearest-centre route and later **live volunteer tracking** (location, route, ETA).
- **Volunteers:** Log in (email/password), choose a relief centre, see **realtime requests**, accept and update status (Accepted → En route → Completed), optionally **share GPS** for victim tracking and use **Google Maps / OSRM** for navigation.
- **Admins:** Manage **relief centres** (CRUD) with map-based placement for OSRM integration.
- **Backend:** Persist request/dispatch state, compute routes via **OSRM**, expose **REST APIs** and optional **PostGIS** storage for route geometry.

### 1.3 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 16, React 19)                    │
│  Need Help │ Dashboard │ Route │ Volunteer │ Admin │ Auth (Login/Register)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ REST (JSON), JWT for volunteer/admin
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI, Python 3.x)                         │
│  Requesters │ Auth │ Route │ Relief Centres │ Relief Request Actions │       │
│  Weather │ Admin │ CORS                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                              │
         │                    │ HTTP                          │ HTTP
         ▼                    ▼                              ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐
│  Neon PostgreSQL │  │  OSRM (routing) │  │  OpenWeatherMap API (weather)    │
│  + PostGIS       │  │  driving routes │  │  current + route weather         │
└─────────────────┘  └─────────────────┘  └─────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Backend

| Component        | Technology              | Version / Notes |
|-----------------|-------------------------|-----------------|
| Runtime         | Python                  | 3.x             |
| Web framework   | FastAPI                 | 0.127+          |
| Database ORM    | SQLAlchemy              | 2.x             |
| Database        | PostgreSQL (Neon)       | Cloud-hosted, connection string in env |
| Spatial         | PostGIS, GeoAlchemy2    | Extensions for geometry (e.g. LineString) |
| Migrations      | Alembic                 | 1.13+           |
| Auth            | JWT (python-jose), bcrypt/passlib | HS256, volunteer & admin only |
| HTTP client     | requests                | For OSRM, OpenWeatherMap |
| Config          | python-dotenv           | DATABASE_URL, SECRET_KEY, OSRM_BASE_URL, OPENWEATHERMAP_API_KEY, etc. |

**Key backend modules:**

- `app/main.py` — FastAPI app, CORS, router includes.
- `app/database.py` — Engine, session, model exports (User, Requester, ReliefCenter, ReliefRequest, Dispatch, Route, etc.).
- `app/routers/` — requesters, auth, route, relief_centre, relief_request_actions, weather, admin.
- `app/services/` — osrm_service, relief_centre_service, weather_service, auth_service.
- `app/models/` — user, requester, relief_center, relief_request, dispatch, route, volunteer_profile (base in `base.py`).

### 2.2 Frontend

| Component        | Technology              | Version / Notes |
|-----------------|-------------------------|-----------------|
| Framework       | Next.js                 | 16.x            |
| UI library      | React                   | 19.x            |
| Language        | TypeScript              | 5.x             |
| Styling         | Tailwind CSS            | 4.x             |
| Maps            | Leaflet, react-leaflet  | 1.9.x, 5.x      |
| State / auth    | React context (AuthContext), localStorage | JWT token, requester device_id |

**Key frontend modules:**

- `app/need-help/page.tsx` — Victim flow: supply selection, confirm, requester form (name/phone), submit request, route display, **live tracking** (volunteer location, ETA, polling).
- `app/dashboard/page.tsx` — Map, weather, route to nearest centre.
- `app/route/page.tsx` — Standalone route planning (public).
- `app/volunteer/page.tsx` — Centre selection, **request list (polling)**, accept, status updates, location sharing, link to Google Maps.
- `app/admin/page.tsx` — Map-based CRUD for relief centres (admin-only).
- `app/auth/login/page.tsx`, `app/auth/register/page.tsx` — Volunteer (and admin login); redirect by role.
- `lib/api.ts` — REST client, auth helpers, `getTracking`, `acceptRequest`, `updateRequestStatus`, `updateDispatchLocation`, `getMyActiveDispatch`.
- `lib/requester.ts` — Device ID and requester info (localStorage) for victim flow.

### 2.3 External Services

| Service           | Role |
|-------------------|------|
| **OSRM**          | Road routing (driving), distance/duration and GeoJSON geometry. Configurable via `OSRM_BASE_URL` (e.g. `http://localhost:4000` or `http://localhost:5000`). |
| **OpenWeatherMap**| Current weather by lat/lng; route weather (sampled points); safety/calamity assessment. |
| **Neon**          | Serverless PostgreSQL (and optional PostGIS) for persistence. |
| **OpenStreetMap**  | Tile layer and source of road data used by OSRM. |

---

## 3. Algorithms and Routing

### 3.1 OSRM (Open Source Routing Machine)

OSRM is a high-performance routing engine built on **OpenStreetMap (OSM)** road data. It supports two main preprocessing/query modes:

- **Contraction Hierarchies (CH)**  
  - **Preprocessing:** Nodes are contracted in order of “importance”; shortcuts preserve shortest paths.  
  - **Query:** Bidirectional search using only edges to “more important” nodes.  
  - **Performance:** Very fast queries, ideal when live weight updates are not required.

- **Multi-Level Dijkstra (MLD)**  
  - **Preprocessing:** Graph is **partitioned** (e.g. recursively into cells); then **customize** computes weights per cell.  
  - **Query:** Multi-level Dijkstra over the partition structure.  
  - **Performance:** Slightly slower than CH (still millisecond range) but supports **faster weight customization** and is recommended for scenarios that may need **live updates** (e.g. traffic).

In this project, the backend calls OSRM’s **HTTP API** (e.g. `GET /route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson`). The actual algorithm (CH or MLD) is determined by how the OSRM server is started (`--algorithm ch` or `--algorithm mld`), not by the application code. For an IEEE paper, you can state that the system uses OSRM, which implements **Contraction Hierarchies** and **Multi-Level Dijkstra** for shortest-path computation on road networks.

**Relevant formulas (conceptual):**  
- Shortest path: minimization of edge weights (e.g. travel time or distance).  
- CH: node contraction with shortcut edges; bidirectional search.  
- MLD: partition-based levels; Dijkstra restricted to levels/cells.

### 3.2 Nearest Relief Centre (Haversine + OSRM)

The system finds the **nearest** relief centre by **travel distance** (not straight-line):

1. **Haversine distance (approximate)**  
   For each relief centre, compute great-circle distance between user \((lat_1, lon_1)\) and centre \((lat_2, lon_2)\):

   \[
   a = \sin^2(\Delta\phi/2) + \cos(\phi_1)\cos(\phi_2)\sin^2(\Delta\lambda/2), \quad
   c = 2\,\mathrm{atan2}(\sqrt{a}, \sqrt{1-a}), \quad
   d = R \cdot c
   \]
   with \(R = 6371\) km (Earth radius), angles in radians.

2. **Candidate set**  
   Sort centres by Haversine distance and take the **top 5** (configurable) to limit OSRM calls.

3. **OSRM routing**  
   For each candidate, request the **driving route** from user location to centre. Compare **route distance** (or duration) and choose the centre with **minimum travel distance**.

4. **Output**  
   Return the chosen relief centre plus full route (geometry, distance, duration) for display and for creating the relief request.

This hybrid approach reduces API calls while ensuring “nearest” is by **road network**, not straight-line.

### 3.3 Weather and Safety Assessment

- **Inputs:** Current weather (temperature, condition, rainfall, wind, alerts) from OpenWeatherMap for a point or along a route.  
- **Logic (rule-based):**  
  - Heavy rainfall, thunderstorms, tornado, etc. → **unsafe**.  
  - Moderate rainfall, strong winds, or alerts → **caution**.  
  - Otherwise → **safe**.  
- **Outputs:** Safety status (safe / caution / unsafe), message, and a list of “calamities” (e.g. heavy rainfall, strong winds) for UI display and for potential use in future risk-weighted routing.

---

## 4. Data Models and Persistence

### 4.1 PostgreSQL (Neon) and PostGIS

- **Database:** Neon PostgreSQL; connection string via `DATABASE_URL`.  
- **PostGIS:** Used for spatial columns (e.g. `Route.geometry` as LineString, SRID 4326) and optional spatial indexing (e.g. GiST on geometry).  
- **Migrations:** Alembic; initial migration creates tables and enables PostGIS; later migration adds volunteer location fields to `dispatches`.

### 4.2 Core Entities

- **users** — Volunteers and admins: id, name, email, password_hash, role (VOLUNTEER | ADMIN), phone, created_at.  
- **requesters** — Victims (no login): id, device_id (unique), full_name, phone, created_at, updated_at.  
- **relief_centers** — id, name, latitude, longitude.  
- **relief_requests** — id, requester_id, relief_centre_id, request_type, supplies (JSONB), urgency_level, status (PENDING | ACCEPTED | IN_PROGRESS | COMPLETED), latitude, longitude, created_at.  
- **dispatches** — id, request_id, volunteer_id, assigned_at, status (PENDING | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED), volunteer_latitude, volunteer_longitude, location_updated_at (for live tracking).  
- **routes** — id, dispatch_id, geometry (PostGIS LineString), distance, duration, risk_score (optional).  
- **volunteer_profiles** — id, user_id, relief_center_id, vehicle_type, availability_status (e.g. AVAILABLE | BUSY).

Relations: Requester → ReliefRequest; ReliefCenter → ReliefRequest; User → Dispatch; ReliefRequest → Dispatch; Dispatch → Route; User → VolunteerProfile → ReliefCenter.

---

## 5. API Overview (REST)

- **Public (no auth):**  
  - `GET /relief-centres/` — List relief centres.  
  - `POST /relief-centres/nearest` — Body: lat, lng. Returns nearest centre + OSRM route.  
  - `POST /relief-centres/requests` — Body: device_id, relief_centre_id, latitude, longitude, supplies. Create relief request.  
  - `POST /route/` — Body: start/end lat-lng. Returns OSRM route.  
  - `GET /weather/?latitude=&longitude=` — Current weather and safety.  
  - `POST /weather/route` — Weather along a route (coordinates).  
  - `GET /relief-requests/{id}/tracking?device_id=` — Victim tracking: status, volunteer location, route to victim, ETA.  
  - `POST /requesters/register-device` — Body: full_name, phone, optional device_id. Register or update requester by device.

- **Volunteer (JWT):**  
  - `GET /relief-centres/{centre_id}/requests` — List requests for a centre.  
  - `GET /relief-requests/my-active` — My active dispatch (request_id, dispatch_id).  
  - `POST /relief-requests/{id}/accept` — Accept request (creates dispatch, sets request to ACCEPTED).  
  - `PATCH /relief-requests/{id}/status` — Body: status (IN_PROGRESS | COMPLETED).  
  - `POST /relief-requests/dispatches/{dispatch_id}/location` — Body: latitude, longitude. Update volunteer’s live location.

- **Admin (JWT):**  
  - `GET/POST/PUT/DELETE /admin/relief-centres` — CRUD relief centres.

- **Auth:**  
  - `POST /auth/register` — Volunteer sign-up (role VOLUNTEER).  
  - `POST /auth/login` — Returns JWT.  
  - `GET /auth/me` — Current user (role used for redirect).

---

## 6. User Flows (Brief)

- **Victim (need-help):** Select supplies → Confirm & Route → (if no device) enter name/phone → backend: nearest centre (Haversine + OSRM) + create request → show route and “Request confirmed” → polling tracking for volunteer status and live location/ETA.  
- **Volunteer:** Login → choose relief centre → see list (polling) → Accept → Start trip (IN_PROGRESS) → optional “Share my location” → Mark completed; link to Google Maps for navigation.  
- **Admin:** Login → manage relief centres on map (add/edit/delete).  
- **Dashboard / Route pages:** Public map and route planning; dashboard can show nearest centre and weather.

---

## 7. Notes for an IEEE Research Paper

### 7.1 Suggested Sections

- **Abstract** — Disaster relief routing and dispatch; use of OSRM (CH/MLD) for road-network routing; Haversine pre-filtering for nearest-centre; victim volunteer coordination and live tracking; weather-aware safety; stack (FastAPI, Next.js, PostgreSQL/PostGIS, OSRM, OpenWeatherMap).  
- **Introduction** — Motivation (disasters, need for fast allocation and routing), objectives (nearest centre, live tracking, low-friction victim flow, volunteer dispatch), scope.  
- **Related Work** — Shortest-path speed-up techniques (CH, MLD), disaster management systems, volunteer coordination platforms, weather-integrated routing.  
- **System Design** — Architecture (frontend/backend/DB/OSRM/weather), roles (victim, volunteer, admin), data model, API design.  
- **Algorithms** — (1) OSRM: CH and MLD in short; (2) nearest relief centre: Haversine formula + OSRM-based selection; (3) weather safety: rule-based classification.  
- **Implementation** — Tech stack, key modules, OSRM and OpenWeatherMap integration, JWT and device_id-based identification.  
- **Results and Discussion** — Use cases, scalability (e.g. number of centres, requests), limitations (OSRM availability, polling vs WebSockets).  
- **Conclusion** — Summary, contributions, future work (e.g. WebSockets, traffic-aware weights, multi-vehicle optimization).  
- **References** — OSRM/CH/MLD papers, OpenStreetMap, FastAPI, Next.js, PostGIS, OpenWeatherMap API, disaster management references.

### 7.2 Key Points to Emphasize

- **Routing:** Use of a **production-grade open-source routing engine (OSRM)** with **Contraction Hierarchies** and **Multi-Level Dijkstra** for road-network shortest paths.  
- **Nearest-centre:** Combination of **Haversine (great-circle) pre-filtering** and **exact travel distance via OSRM** to balance accuracy and API load.  
- **Real-time aspects:** Polling-based updates for request list and victim tracking; volunteer location streaming for ETA and map display.  
- **Access control:** No login for victims (device_id + one-time name/phone); JWT for volunteers and admins; ownership checks for dispatch and location updates.  
- **Spatial data:** PostGIS and GeoAlchemy2 for storing route geometry and optional spatial indexing.  
- **Weather:** Integration of OpenWeatherMap with a simple rule-based safety model for display and potential future risk-weighted routing.

### 7.3 Possible References (Examples)

1. Geisberger, R., Sanders, P., Schultes, D., & Delling, D. (2012). Contraction Hierarchies: Faster and Simpler Hierarchical Routing in Road Networks. *Algorithm Engineering and Experiments (ALENEX)*.  
2. OSRM. (n.d.). *Project OSRM*. https://github.com/Project-OSRM/osrm-backend  
3. OpenStreetMap Foundation. (n.d.). *OpenStreetMap*. https://www.openstreetmap.org  
4. OpenWeatherMap. (n.d.). *Weather API*. https://openweathermap.org/api  
5. FastAPI. (n.d.). *FastAPI*. https://fastapi.tiangolo.com  
6. PostGIS. (n.d.). *PostGIS*. https://postgis.net  

---

## 8. File and Directory Summary

```
ai-resource-dispatch-routing-system/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, routers
│   │   ├── database.py             # DB engine, session, model exports
│   │   ├── models/                  # SQLAlchemy + GeoAlchemy2 models
│   │   ├── routers/                 # auth, requesters, route, relief_centre,
│   │   │                            # relief_request_actions, weather, admin
│   │   ├── schemas/                 # Pydantic request/response
│   │   ├── services/                # osrm, relief_centre, weather, auth
│   │   └── dependencies/            # get_current_user, require_volunteer, require_admin
│   ├── alembic/                     # Migrations (initial + dispatch location)
│   ├── seed_admin.py                # Create admin + sample relief centres
│   ├── requirements.txt
│   └── .env                         # DATABASE_URL, SECRET_KEY, OSRM_BASE_URL, etc.
├── frontend/
│   ├── app/                         # Next.js App Router (need-help, dashboard, route,
│   │                                # volunteer, admin, auth)
│   ├── components/                  # Navbar, ProtectedRoute, RequesterFormModal
│   ├── contexts/                    # AuthContext
│   └── lib/                         # api.ts, requester.ts
├── README.md                        # Setup and usage
└── PROJECT_OVERVIEW.md              # This document
```

---

*This document provides a single reference for project context, tech stack, algorithms (OSRM CH/MLD, Haversine, weather safety), and structure for an IEEE-style research paper.*
