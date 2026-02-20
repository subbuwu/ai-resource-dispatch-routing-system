# Database Setup Guide

This guide explains how to set up PostgreSQL with PostGIS and run database migrations for the disaster relief routing system.

## Prerequisites

1. **PostgreSQL** (version 12 or higher)
2. **PostGIS extension** (version 3.0 or higher)
3. **Python dependencies** installed (see `requirements.txt`)

## Database Setup

### 1. Install PostgreSQL and PostGIS

**macOS (using Homebrew):**
```bash
brew install postgresql postgis
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib postgis postgresql-14-postgis-3
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/) and [PostGIS](https://postgis.net/install/).

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE disaster_routing;

# Connect to the new database
\c disaster_routing

# Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

# Exit psql
\q
```

### 3. Configure Environment Variables

Update `.env` file in the `backend` directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/disaster_routing
```

Replace `username` and `password` with your PostgreSQL credentials.

## Running Migrations

### Initial Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Create initial migration:**
   ```bash
   alembic revision --autogenerate -m "Initial migration with all models"
   ```

3. **Review the migration file:**
   Check the generated file in `alembic/versions/` to ensure it's correct.

4. **Apply migrations:**
   ```bash
   alembic upgrade head
   ```

### Creating New Migrations

When you modify models:

1. **Generate migration:**
   ```bash
   alembic revision --autogenerate -m "Description of changes"
   ```

2. **Review and edit** the migration file if needed.

3. **Apply migration:**
   ```bash
   alembic upgrade head
   ```

### Migration Commands

- **View current revision:** `alembic current`
- **View migration history:** `alembic history`
- **Downgrade one revision:** `alembic downgrade -1`
- **Upgrade to specific revision:** `alembic upgrade <revision>`

## Database Models

The system includes the following models:

1. **User** - User accounts (USER or VOLUNTEER role)
2. **ReliefCenter** - Disaster relief centers with location
3. **VolunteerProfile** - Volunteer information linked to relief centers
4. **ReliefRequest** - User requests for assistance
5. **Dispatch** - Volunteer assignments to requests
6. **Route** - Route geometry and metadata (PostGIS LineString)

## Verification

After running migrations, verify the setup:

```bash
# Connect to database
psql -U username -d disaster_routing

# List tables
\dt

# Check PostGIS extension
SELECT PostGIS_version();

# View routes table structure (should have geometry column)
\d routes

# Exit
\q
```

## Troubleshooting

### PostGIS Extension Not Found

If you get an error about PostGIS extension:

```sql
-- Connect to your database
\c disaster_routing

-- Install PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Migration Errors

If migrations fail:

1. Check database connection in `.env`
2. Ensure PostGIS extension is enabled
3. Review migration files for errors
4. Check Alembic version table: `SELECT * FROM alembic_version;`

### UUID Type Issues

If you see UUID-related errors, ensure PostgreSQL version is 12+:

```sql
SELECT version();
```

## Notes

- The `init_db()` function in `app/models/base.py` can create tables, but Alembic migrations are preferred for production.
- Always backup your database before running migrations in production.
- The Route model uses PostGIS LineString geometry with SRID 4326 (WGS84).
