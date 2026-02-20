#!/bin/bash
# Quick setup script for PostgreSQL database, migrations, and seeding

set -e

echo "=========================================="
echo "Database Setup Script"
echo "=========================================="
echo ""

# Step 1: Setup database
echo "Step 1: Setting up PostgreSQL database..."
./setup_database.sh

# Step 2: Run migrations
echo ""
echo "Step 2: Running Alembic migrations..."
cd "$(dirname "$0")"
alembic upgrade head

# Step 3: Seed relief centers
echo ""
echo "Step 3: Seeding relief centers..."
python seed_relief_centres.py

# Step 4: Verify
echo ""
echo "Step 4: Verifying setup..."
psql -U subbu -d disaster_routing -c "SELECT COUNT(*) as relief_center_count FROM relief_centers;"
psql -U subbu -d disaster_routing -c "\dt"

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
