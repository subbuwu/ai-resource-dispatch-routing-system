# Database Setup Instructions

Follow these steps to set up the PostgreSQL database with PostGIS and run migrations.

## Step 1: Ensure PostgreSQL is Running

Check if PostgreSQL is running:
```bash
# macOS
brew services list | grep postgresql

# Or check if it's running
pg_isready
```

If not running, start it:
```bash
# macOS with Homebrew
brew services start postgresql

# Linux (systemd)
sudo systemctl start postgresql
```

## Step 2: Create Database and Enable PostGIS

Run the setup script:
```bash
cd backend
./setup_database.sh
```

Or manually:
```bash
# Create database
createdb -U subbu disaster_routing

# Enable PostGIS extension
psql -U subbu -d disaster_routing -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -U subbu -d disaster_routing -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

# Verify PostGIS
psql -U subbu -d disaster_routing -c "SELECT PostGIS_version();"
```

## Step 3: Run Alembic Migrations

```bash
cd backend

# Check current migration status
alembic current

# Run migrations (this will create all tables)
alembic upgrade head

# Verify tables were created
psql -U subbu -d disaster_routing -c "\dt"
```

Expected output should show:
- alembic_version
- users
- relief_centers
- volunteer_profiles
- relief_requests
- dispatches
- routes

## Step 4: Seed Relief Centers

```bash
cd backend
python seed_relief_centres.py
```

Or with clear flag to replace existing data:
```bash
python seed_relief_centres.py --clear
```

## Step 5: Verify Setup

```bash
# Check relief centers were seeded
psql -U subbu -d disaster_routing -c "SELECT id, name, latitude, longitude FROM relief_centers;"

# Check PostGIS geometry support
psql -U subbu -d disaster_routing -c "SELECT PostGIS_version();"
```

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Check PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL in `.env` matches your PostgreSQL setup
3. Check PostgreSQL is listening on the correct port: `lsof -i :5432`

### Permission Issues

If you get permission errors:
```bash
# Grant permissions (adjust username as needed)
psql -U postgres -c "ALTER USER subbu CREATEDB;"
```

### PostGIS Not Found

If PostGIS extension is not available:
```bash
# macOS
brew install postgis

# Ubuntu/Debian
sudo apt-get install postgresql-14-postgis-3

# Then enable it
psql -U subbu -d disaster_routing -c "CREATE EXTENSION postgis;"
```

## Quick Setup (All Steps)

```bash
cd backend

# 1. Setup database
./setup_database.sh

# 2. Run migrations
alembic upgrade head

# 3. Seed data
python seed_relief_centres.py

# 4. Verify
psql -U subbu -d disaster_routing -c "SELECT COUNT(*) FROM relief_centers;"
```

You should see `7` relief centers if seeding was successful.
