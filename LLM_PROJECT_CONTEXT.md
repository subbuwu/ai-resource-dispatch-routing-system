# LLM Project Context — AI Resource Dispatch & Routing System

Complete technical summary for LLM-assisted development. Use this file to understand the repository structure, backend architecture, database schema, routing/weather/auth flows, and configuration.

---

## 1. File Tree (up to 4 levels deep)

*Excludes: .git, .next, node_modules, .venv, __pycache__, *.pyc, build artifacts.*

```
ai-resource-dispatch-routing-system/
├── README.md                          # Setup, OSRM (MLD), API overview, troubleshooting
├── PROJECT_OVERVIEW.md                # High-level overview, algorithms, IEEE paper notes
├── LLM_PROJECT_CONTEXT.md             # This file: full technical context for LLMs
│
├── backend/
│   ├── .env                           # DATABASE_URL, SECRET_KEY, OPENWEATHERMAP_API_KEY, OSRM_BASE_URL, etc.
│   ├── .env.example                   # Template for env vars (DB, auth, weather, OSRM)
│   ├── alembic.ini                     # Alembic config; script_location = alembic
│   ├── requirements.txt               # FastAPI, SQLAlchemy, psycopg2, geoalchemy2, alembic, python-jose, passlib, requests
│   ├── seed_admin.py                  # Creates one admin user + optional relief centres; uses bcrypt for hash
│   ├── seed_relief_centres.py         # Optional script to seed relief centres
│   ├── setup_database.sh              # Shell script for DB setup
│   ├── QUICK_SETUP.sh                 # Quick setup helper
│   ├── DATABASE_SETUP.md              # DB setup documentation
│   ├── MIGRATION_NOTES.md              # Migration notes
│   ├── SETUP_INSTRUCTIONS.md          # Setup instructions
│   ├── RELIEF_CENTRES_SETUP.md        # Relief centres setup
│   ├── SAMPLE_ENV.txt                 # Sample env file
│   │
│   ├── alembic/
│   │   ├── env.py                     # Loads DATABASE_URL from env; imports all models for autogenerate
│   │   ├── README                     # Alembic readme
│   │   ├── script.py.mako             # Migration template
│   │   └── versions/
│   │       ├── 2978238d8766_initial_migration.py   # PostGIS + all tables (relief_centers, users, requesters, relief_requests, volunteer_profiles, dispatches, routes)
│   │       └── add_dispatch_volunteer_location.py   # Adds volunteer_latitude, volunteer_longitude, location_updated_at to dispatches
│   │
│   ├── app/
│   │   ├── main.py                    # FastAPI app; CORS; includes requesters, auth, route, relief_centre, relief_request_actions, weather, admin
│   │   ├── database.py                # Exports Base, SessionLocal, get_db, init_db, engine; all models
│   │   │
│   │   ├── dependencies/
│   │   │   └── auth.py                # get_current_user (JWT), require_volunteer, require_admin; HTTPBearer
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py            # Re-exports (if any)
│   │   │   ├── base.py                # create_engine(DATABASE_URL), SessionLocal, Base, get_db, init_db
│   │   │   ├── user.py                # User (id, name, email, password_hash, role VOLUNTEER|ADMIN, phone, created_at)
│   │   │   ├── requester.py           # Requester (id, device_id, full_name, phone, created_at, updated_at)
│   │   │   ├── relief_center.py        # ReliefCenter (id, name, latitude, longitude)
│   │   │   ├── relief_request.py       # ReliefRequest (requester_id, relief_centre_id, supplies JSONB, status, lat/lng, etc.)
│   │   │   ├── dispatch.py             # Dispatch (request_id, volunteer_id, status, volunteer_lat/lng, location_updated_at)
│   │   │   ├── route.py                # Route (dispatch_id, geometry PostGIS LineString, distance, duration, risk_score)
│   │   │   └── volunteer_profile.py   # VolunteerProfile (user_id, relief_center_id, vehicle_type, availability_status)
│   │   │
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # POST /auth/register, /auth/login; GET /auth/me (JWT)
│   │   │   ├── requesters.py           # POST /requesters/register-device (public)
│   │   │   ├── route.py               # POST /route/ (public; OSRM)
│   │   │   ├── relief_centre.py       # GET /relief-centres/, POST /nearest, POST /requests, GET /{id}/requests (volunteer)
│   │   │   ├── relief_request_actions.py  # GET /relief-requests/my-active; POST /{id}/accept; PATCH /{id}/status; GET /{id}/tracking; POST /dispatches/{id}/location
│   │   │   ├── weather.py             # GET /weather/?lat=&lng=; POST /weather/route (body: coordinates)
│   │   │   └── admin.py               # GET/POST/PUT/DELETE /admin/relief-centres (admin only)
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.py                # UserRegister, UserLogin, Token, UserResponse
│   │   │   ├── requester.py           # RegisterDeviceRequest, RegisterDeviceResponse
│   │   │   ├── route.py               # RouteRequest, RouteResponse, Point, RouteSummary
│   │   │   ├── relief_centre.py       # ReliefCentreCreate/Response, Nearest*, ReliefRequestCreate/Response, RequestStatusUpdate, DispatchLocationUpdate, TrackingResponse
│   │   │   └── weather.py             # WeatherData, WeatherRequest, RouteWeatherRequest/Response
│   │   │
│   │   └── services/
│   │       ├── auth_service.py        # verify_password, get_password_hash (bcrypt), create_access_token, decode_token, authenticate_user, create_user
│   │       ├── osrm_service.py        # get_route(start_lat, start_lng, end_lat, end_lng) -> summary, geometry, coordinates
│   │       ├── relief_centre_service.py  # get_all_relief_centres; calculate_haversine_distance; find_nearest_relief_centre (Haversine top-5 + OSRM)
│   │       └── weather_service.py     # assess_safety_status; get_weather_data(lat, lng); get_weather_along_route(coordinates)
│   │
│   └── osrm/
│       └── README.md                  # OSRM data/setup (optional; pre-processed map data)
│
└── frontend/
    ├── package.json                   # next 16, react 19, leaflet, react-leaflet, tailwind, typescript
    ├── tsconfig.json                  # TypeScript config
    ├── next.config.ts                 # Next.js config
    ├── next-env.d.ts                  # Next env types
    ├── app/
    │   ├── layout.tsx                 # Root layout; Navbar; AuthProvider
    │   ├── globals.css                # Global Tailwind/styles
    │   ├── page.tsx                   # Home/landing
    │   ├── need-help/page.tsx          # Victim: supply selection, confirm, requester modal, submit request, route + live tracking (polling)
    │   ├── dashboard/page.tsx         # Map, weather, route to nearest centre (public)
    │   ├── route/page.tsx             # Standalone route planning (public; OSRM)
    │   ├── volunteer/page.tsx         # Volunteer: centre list, request list (polling), accept, status, location sharing, Google Maps link
    │   ├── admin/page.tsx             # Admin: map + list; CRUD relief centres (protected requireAdmin)
    │   ├── help/page.tsx             # Alternative help/map page
    │   └── auth/
    │       ├── login/page.tsx         # Email/password login; redirect by role (admin -> /admin, else -> /volunteer)
    │       └── register/page.tsx      # Volunteer sign-up only; redirect to /volunteer
    ├── components/
    │   ├── Navbar.tsx                 # Links: Dashboard, Need Help, Route, Volunteer, Admin; login/logout
    │   ├── ProtectedRoute.tsx         # Wraps pages; requireVolunteer or requireAdmin; redirect to /auth/login if not authenticated
    │   └── RequesterFormModal.tsx     # Modal: name, phone; registerRequesterDevice; onSuccess calls parent doSubmitRequest
    ├── contexts/
    │   └── AuthContext.tsx            # user, login, register, logout, isAuthenticated, isVolunteer, isAdmin; JWT in localStorage
    └── lib/
        ├── api.ts                    # apiRequest, registerRequesterDevice, authApi, getTracking, acceptRequest, updateRequestStatus, updateDispatchLocation, getMyActiveDispatch
        └── requester.ts              # getDeviceId, setDeviceId, getRequesterInfo, setRequesterInfo, hasRequesterSession (localStorage)
```

---

## 2. Backend Architecture Overview

### 2.1 Routers (API surface)

| Router | Prefix | Auth | Description |
|--------|--------|------|-------------|
| requesters | /requesters | None | POST register-device (create/update requester by device_id). |
| auth | /auth | None for login/register; Bearer for /me | POST register (volunteer only), POST login (JWT), GET me. |
| route | /route | None | POST / (start/end lat-lng → OSRM route). |
| relief_centre | /relief-centres | None for list/nearest/requests create; Volunteer for list requests | GET /, POST nearest, POST requests, GET /{centre_id}/requests. |
| relief_request_actions | /relief-requests | Volunteer for most; tracking by device_id | GET my-active, POST /{id}/accept, PATCH /{id}/status, GET /{id}/tracking?device_id=, POST /dispatches/{id}/location. |
| weather | /weather | None | GET /?latitude=&longitude=; POST /route (body: coordinates). |
| admin | /admin | Admin | GET/POST/PUT/DELETE /admin/relief-centres. |

### 2.2 Services (business logic)

- **auth_service:** Password hashing (bcrypt), JWT create/decode, authenticate_user, create_user (VOLUNTEER or ADMIN only).
- **osrm_service:** Single function `get_route(start_lat, start_lng, end_lat, end_lng)`; calls OSRM HTTP API; returns summary (distance, duration, formatted), start/end, geometry (GeoJSON), coordinates array.
- **relief_centre_service:** get_all_relief_centres; calculate_haversine_distance (great-circle); find_nearest_relief_centre (Haversine sort → top 5 → OSRM route each → pick min travel distance).
- **weather_service:** assess_safety_status (rule-based: rainfall, wind, condition → safe/caution/unsafe); get_weather_data (OpenWeatherMap current weather + safety); get_weather_along_route (sample points, aggregate summary).

### 2.3 Models (SQLAlchemy + GeoAlchemy2)

- **base:** Engine from DATABASE_URL, SessionLocal, Base, get_db, init_db.
- **user:** UserRole enum (VOLUNTEER, ADMIN). User: id (UUID), name, email, password_hash, role, phone, created_at.
- **requester:** Requester: id, device_id (unique), full_name, phone, created_at, updated_at.
- **relief_center:** ReliefCenter: id, name, latitude, longitude.
- **relief_request:** ReliefRequestStatus enum. ReliefRequest: id, requester_id, relief_centre_id, request_type, supplies (JSONB), urgency_level, status, latitude, longitude, created_at; CheckConstraint urgency 1–5.
- **dispatch:** DispatchStatus enum. Dispatch: id, request_id, volunteer_id, assigned_at, status, volunteer_latitude, volunteer_longitude, location_updated_at.
- **route:** Route: id, dispatch_id, geometry (PostGIS LineString SRID 4326), distance, duration, risk_score; GiST index on geometry.
- **volunteer_profile:** AvailabilityStatus enum. VolunteerProfile: id, user_id, relief_center_id, vehicle_type, availability_status.

### 2.4 Schemas (Pydantic)

- **auth:** UserRegister, UserLogin, Token, UserResponse, TokenData.
- **requester:** RegisterDeviceRequest (full_name, phone, device_id optional), RegisterDeviceResponse.
- **route:** RouteRequest (start/end lat-lng), RouteResponse (summary, start, end, geometry, coordinates).
- **relief_centre:** ReliefCentreCreate/Response; NearestReliefCentreRequest/Response; ReliefRequestCreate/Response; RequestStatusUpdate; DispatchLocationUpdate; TrackingResponse (request, status, victim/volunteer coords, route_to_victim, eta_minutes).
- **weather:** WeatherData, WeatherRequest, RouteWeatherRequest, RouteWeatherResponse.

### 2.5 Dependencies

- **auth.py:** HTTPBearer security. get_current_user(credentials, db) → User (decode JWT sub, load user). require_volunteer(current_user) → 403 if not VOLUNTEER. require_admin(current_user) → 403 if not ADMIN.

---

## 3. Database Schema (PostgreSQL + PostGIS)

**PostGIS:** Enabled in the first Alembic migration: `CREATE EXTENSION IF NOT EXISTS postgis;`. Used by the `routes` table (geometry column) and optional spatial indexing.

### Tables and columns

| Table | Columns |
|-------|---------|
| **relief_centers** | id (UUID PK), name, latitude, longitude. Indexes: id, name. |
| **users** | id (UUID PK), name, email (unique), password_hash, role (enum VOLUNTEER, ADMIN), phone, created_at. Indexes: id, email, role. |
| **requesters** | id (UUID PK), device_id (unique), full_name, phone, created_at, updated_at. Indexes: id, device_id. |
| **relief_requests** | id (UUID PK), requester_id (FK requesters), relief_centre_id (FK relief_centers), request_type, supplies (JSONB), urgency_level (1–5), status (enum), latitude, longitude, created_at. Indexes: id, requester_id, relief_centre_id, status, urgency_level, created_at. |
| **volunteer_profiles** | id (UUID PK), user_id (FK users), relief_center_id (FK relief_centers), vehicle_type, availability_status (enum). Indexes: id, user_id, relief_center_id, availability_status. |
| **dispatches** | id (UUID PK), request_id (FK relief_requests), volunteer_id (FK users), assigned_at, status (enum), volunteer_latitude, volunteer_longitude, location_updated_at. Indexes: id, request_id, volunteer_id, assigned_at, status. |
| **routes** | id (UUID PK), dispatch_id (FK dispatches), geometry (PostGIS LineString, SRID 4326), distance, duration, risk_score. Indexes: id, dispatch_id; GiST index on geometry. |

Enums: userrole (VOLUNTEER, ADMIN); reliefrequeststatus (PENDING, ACCEPTED, IN_PROGRESS, COMPLETED); availabilitystatus (AVAILABLE, BUSY); dispatchstatus (PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED).

---

## 4. Current Routing Logic Flow

1. **Victim (need-help page):** User selects supplies → Confirm & Route. If no requester session, name/phone modal → POST /requesters/register-device → then:
   - POST /relief-centres/nearest with (latitude, longitude) from browser geolocation.
   - Backend: relief_centre_service.find_nearest_relief_centre → Haversine to all centres → sort → top 5 → for each, OSRM get_route(user → centre) → choose centre with minimum route distance → return centre + route.
   - Frontend: POST /relief-centres/requests with device_id, relief_centre_id (from nearest), latitude, longitude, supplies.
   - Backend: Look up Requester by device_id; create ReliefRequest (PENDING); return request id.
   - Frontend: Store createdRequestId; display route polyline and “Request confirmed”; start tracking polling.

2. **Standalone route (route page):** User sets start/end (or map click). POST /route/ with start_lat, start_lng, end_lat, end_lng. Backend calls osrm_service.get_route; returns geometry and summary. Frontend draws polyline and directions.

3. **Volunteer → victim (tracking):** When victim polls GET /relief-requests/{id}/tracking?device_id=, backend computes route from volunteer’s last location to victim via OSRM and returns ETA and route_to_victim geometry.

---

## 5. OSRM Integration Details

- **Config:** Base URL from env: `OSRM_BASE_URL` (default in code: `http://localhost:4000`). README and .env.example also mention port 4000; older README says 5000 for `osrm-routed`.
- **Endpoint used:** `GET {OSRM_BASE_URL}/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson`. Coordinates order: lng,lat in URL.
- **Response used:** routes[0].geometry.coordinates (array of [lng, lat]), routes[0].distance (meters), routes[0].duration (seconds). Backend maps these into summary (distance, duration, formatted strings), start/end points, and a coordinates array for the frontend.
- **How OSRM is started:** Per README, the server is started as `osrm-routed --algorithm mld osrm/map.osrm` (or with `--algorithm ch` for Contraction Hierarchies). So the project documents **MLD** as the default; CH is optional. The application code does not choose the algorithm—only the OSRM server binary and its flags do.
- **Usage in code:** osrm_service.get_route() is used by: (1) relief_centre_service.find_nearest_relief_centre (user → each candidate centre), (2) route router POST /route/, (3) relief_request_actions get_tracking (volunteer location → victim location for ETA and route_to_victim).

---

## 6. Weather Integration Flow

- **API:** OpenWeatherMap. Code reads `OPENWEATHER_API_KEY` (note: .env.example uses `OPENWEATHERMAP_API_KEY`; ensure one is set and consistent). Base URL: `https://api.openweathermap.org/data/2.5`.
- **Current weather:** GET /weather/?latitude=&longitude= → backend calls weather_service.get_weather_data(lat, lng) → requests GET .../weather?lat=&lon=&appid=&units=metric → extracts temp, condition, description, humidity, wind_speed, rainfall (1h), icon; then assess_safety_status (rule-based: rainfall >20 → unsafe, >10 → caution; thunderstorm/extreme → unsafe; wind >20 → caution; alerts → calamities). Returns WeatherData including safety_status, safety_message, calamities.
- **Route weather:** POST /weather/route with body { coordinates: [[lng,lat], ...] } → get_weather_along_route samples up to 5 points along the route, calls get_weather_data for each, returns route_weather list and summary (avg_temperature, max_rainfall, has_alerts).
- **Frontend:** need-help and dashboard use current weather and optional route weather for banners and safety messages.

---

## 7. Authentication Flow

- **Volunteer/Admin only:** No login for victims (they use device_id + name/phone once).
- **Register:** POST /auth/register with name, email, password, role=VOLUNTEER (only VOLUNTEER allowed; admins created via seed_admin.py). Backend hashes password (bcrypt), creates User, returns user payload. Frontend then logs in with same credentials to get JWT.
- **Login:** POST /auth/login with email, password. Backend authenticates via auth_service.authenticate_user; on success creates JWT with create_access_token(data={"sub": user.id, "email", "role"}, expires_delta). Returns { access_token, token_type: "bearer" }. Frontend stores token in localStorage, uses in Authorization: Bearer for protected requests.
- **Protected endpoints:** Dependencies get_current_user (reads Bearer token, decode_token, load User by sub), require_volunteer (must be VOLUNTEER), require_admin (must be ADMIN). 401 if token invalid/missing; 403 if role insufficient.
- **Frontend:** AuthContext holds user, login(), register(), logout(), isVolunteer, isAdmin. ProtectedRoute wraps volunteer/admin pages and redirects to /auth/login when not authenticated; after login, redirect by role (admin → /admin, else → /volunteer).

---

## 8. Volunteer Dispatch Workflow

1. **List requests:** Volunteer selects a relief centre. Frontend polls GET /relief-centres/{centre_id}/requests every 5 seconds (realtime: polling). Response: list of ReliefRequest with requester_name, requester_phone, supplies, status, lat/lng.
2. **Accept:** Volunteer clicks Accept on a PENDING request. Frontend POST /relief-requests/{request_id}/accept. Backend creates Dispatch (volunteer_id, request_id, status ASSIGNED), sets ReliefRequest.status = ACCEPTED, returns dispatch_id and request_id. Frontend stores myDispatchId, myRequestId.
3. **Start trip:** Volunteer clicks “Start trip”. PATCH /relief-requests/{request_id}/status with body { status: "IN_PROGRESS" }. Backend updates request and dispatch status to IN_PROGRESS.
4. **Location sharing:** Optional “Share my location” checkbox. Frontend uses navigator.geolocation.watchPosition and periodically POST /relief-requests/dispatches/{dispatch_id}/location with current lat/lng. Backend updates dispatch.volunteer_latitude, volunteer_longitude, location_updated_at.
5. **Victim tracking:** Victim’s need-help page polls GET /relief-requests/{request_id}/tracking?device_id= every 5 seconds. Backend returns status, volunteer name, volunteer lat/lng, and (if volunteer location present) OSRM route from volunteer to victim with ETA. Frontend shows volunteer marker and route polyline on map.
6. **Complete:** Volunteer clicks “Mark completed”. PATCH /relief-requests/{request_id}/status with { status: "COMPLETED" }. Backend sets request and dispatch to COMPLETED. Frontend clears myDispatchId/myRequestId; victim’s polling sees COMPLETED and shows “Help completed.”
7. **Restore state:** On volunteer page load, GET /relief-requests/my-active returns current user’s active dispatch (request_id, dispatch_id) so UI can show Navigate/Complete without re-accepting.

---

## 9. Optimization-Related Code

- **Haversine pre-filter (relief_centre_service):** Before calling OSRM, all relief centres are ranked by great-circle distance (Haversine). Only the **top 5** candidates are sent to OSRM for actual driving route distance. This reduces OSRM API calls while keeping “nearest” defined by travel distance.
- **No other explicit optimization logic** (e.g. no route caching, no multi-vehicle optimization, no traffic-aware weights) is present in the codebase. Route geometry can be stored in the `routes` table (PostGIS) for dispatches, but the current volunteer flow does not persist OSRM route to that table on accept; tracking ETA is computed on the fly from volunteer location to victim.

---

## 10. PostGIS, OSRM Algorithm, and Real-Time Updates

- **PostGIS:** Enabled in the initial Alembic migration (`CREATE EXTENSION IF NOT EXISTS postgis;`). Used by the `routes` table (geometry column type LineString, SRID 4326) and a GiST index on that column. No other spatial queries (e.g. “centres within radius”) are implemented in the current code; nearest-centre uses Haversine in application code plus OSRM.
- **OSRM algorithm:** The repository README and setup instruct starting OSRM with **MLD** (Multi-Level Dijkstra): `osrm-routed --algorithm mld osrm/map.osrm`. Alternative: `--algorithm ch` for Contraction Hierarchies. The backend does not pass an algorithm; it only calls the OSRM HTTP route API.
- **Real-time updates:** Implemented via **polling only**. There are **no WebSockets** in the project. Volunteer dashboard polls GET /relief-centres/{centre_id}/requests every 5 seconds. Victim need-help page polls GET /relief-requests/{request_id}/tracking?device_id= every 5 seconds after a request is created. Volunteer location is sent when “Share my location” is on (browser geolocation + periodic POST to dispatch location).

---

## 11. Environment and Configuration Summary

- **Backend .env (or .env.example):** DATABASE_URL (Neon PostgreSQL), SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES, OPENWEATHERMAP_API_KEY or OPENWEATHER_API_KEY (weather_service uses OPENWEATHER_API_KEY), OSRM_BASE_URL (e.g. http://localhost:4000), optional ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_NAME for seed_admin, WEATHER_*, LOG_LEVEL, ENVIRONMENT.
- **Frontend:** NEXT_PUBLIC_BACKEND_URL (default http://localhost:8000) for API base. Auth token and requester device_id/requester_info in localStorage.

---

*End of LLM Project Context. Use this document for development planning, onboarding, or as context for an LLM working on this repository.*
