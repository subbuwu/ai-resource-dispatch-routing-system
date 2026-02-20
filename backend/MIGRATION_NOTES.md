# Migration Notes: SQLite to PostgreSQL with PostGIS

This document outlines the changes made when migrating from SQLite to PostgreSQL with PostGIS support.

## Key Changes

### Database Models

1. **ReliefCentre → ReliefCenter**
   - Table name changed from `relief_centres` to `relief_centers`
   - Removed `status` and `capacity` fields (as per new schema requirements)
   - Changed `id` from `Integer` to `UUID`

2. **New Models Added**
   - `User` - User accounts with roles (USER/VOLUNTEER)
   - `VolunteerProfile` - Links volunteers to relief centers
   - `ReliefRequest` - Updated schema with user_id, request_type, urgency_level
   - `Dispatch` - Volunteer assignments to requests
   - `Route` - PostGIS LineString geometry for route storage

3. **ReliefRequest Changes**
   - Changed from `relief_centre_id` to `user_id` (FK to User)
   - Added `request_type` (string) instead of `supplies` (JSON)
   - Added `urgency_level` (integer 1-5)
   - Changed status enum values to uppercase (PENDING, ACCEPTED, IN_PROGRESS, COMPLETED)

### Database Configuration

- **Before**: SQLite (`sqlite:///relief_centres.db`)
- **After**: PostgreSQL with PostGIS (`postgresql://user@host:port/database`)
- Database URL configured via `DATABASE_URL` environment variable

### Migration Path

1. **Run Alembic migrations** to create new schema:
   ```bash
   alembic revision --autogenerate -m "Initial migration"
   alembic upgrade head
   ```

2. **Migrate existing data** (if needed):
   - Export data from SQLite database
   - Transform data to match new schema
   - Import into PostgreSQL

3. **Update seed script**:
   - Use new `ReliefCenter` model
   - Remove `status` and `capacity` fields

### Backward Compatibility

- API endpoints maintain backward compatibility where possible
- Some endpoints may need frontend updates (e.g., ReliefRequest creation)
- Old ReliefRequest endpoints adapted but may need proper user authentication

### Breaking Changes

1. **ReliefRequest Creation**
   - Old: Required `relief_centre_id` and `supplies` array
   - New: Requires `user_id`, `request_type`, and `urgency_level`
   - Current implementation provides backward compatibility but should be updated

2. **ReliefCenter Response**
   - Removed `status` and `capacity` fields from API responses
   - Frontend should be updated to not expect these fields

3. **UUID vs Integer IDs**
   - All IDs are now UUIDs instead of integers
   - Frontend should handle UUID strings

## Next Steps

1. **Update Frontend**:
   - Handle UUID IDs instead of integers
   - Remove references to `status` and `capacity` in ReliefCenter
   - Update ReliefRequest creation to use new schema

2. **Add Authentication**:
   - Implement user authentication endpoints
   - Add user registration/login
   - Protect endpoints that require user context

3. **Complete ReliefRequest Migration**:
   - Update `/relief-centres/requests` endpoint to properly query via VolunteerProfile
   - Add proper user authentication

4. **Add Route Storage**:
   - Implement saving routes to database after OSRM calculation
   - Link routes to Dispatch records

## Testing

After migration:

1. Verify database connection:
   ```python
   from app.database import SessionLocal, ReliefCenter
   db = SessionLocal()
   centres = db.query(ReliefCenter).all()
   ```

2. Test PostGIS functionality:
   ```sql
   SELECT PostGIS_version();
   SELECT ST_AsText(geometry) FROM routes LIMIT 1;
   ```

3. Verify all models:
   ```python
   from app.models import User, ReliefCenter, VolunteerProfile, ReliefRequest, Dispatch, Route
   # All imports should work
   ```
