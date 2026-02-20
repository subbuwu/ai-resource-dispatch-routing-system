#!/bin/bash
# Script to set up PostgreSQL database with PostGIS extension

set -e

echo "Setting up PostgreSQL database..."

# Check if database exists
DB_EXISTS=$(psql -U subbu -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='disaster_routing'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" = "1" ]; then
    echo "Database 'disaster_routing' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        psql -U subbu -d postgres -c "DROP DATABASE IF EXISTS disaster_routing;"
        echo "Creating new database..."
        psql -U subbu -d postgres -c "CREATE DATABASE disaster_routing;"
    else
        echo "Using existing database."
    fi
else
    echo "Creating database 'disaster_routing'..."
    psql -U subbu -d postgres -c "CREATE DATABASE disaster_routing;"
fi

echo "Enabling PostGIS extension..."
psql -U subbu -d disaster_routing -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -U subbu -d disaster_routing -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

echo "Database setup complete!"
echo ""
echo "PostGIS version:"
psql -U subbu -d disaster_routing -c "SELECT PostGIS_version();"
