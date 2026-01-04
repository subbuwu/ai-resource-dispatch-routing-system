"""
Script to seed sample relief centres into the database
Run this once to populate the database with initial data
"""
from app.database import SessionLocal, ReliefCentre, ReliefCentreStatus

def seed_relief_centres(clear_existing=False):
    """Add sample relief centres to the database"""
    db = SessionLocal()
    
    try:
        # Clear existing centres if requested
        existing = db.query(ReliefCentre).count()
        if existing > 0:
            if clear_existing:
                print(f"Removing {existing} existing relief centres...")
                db.query(ReliefCentre).delete()
                db.commit()
                print("Existing relief centres removed.")
            else:
                print(f"Database already has {existing} relief centres. Skipping seed.")
                print("To replace existing data, run: seed_relief_centres(clear_existing=True)")
                return
        
        # Relief centres in Guduvancherry, Maraimalai Nagar, Potheri area (Chengalpattu district, Tamil Nadu)
        sample_centres = [
            {
                "name": "Guduvancherry Central Relief Centre",
                "latitude": 12.6939,
                "longitude": 79.9757,
                "capacity": 500,
                "status": ReliefCentreStatus.ACTIVE
            },
            {
                "name": "Maraimalai Nagar Emergency Shelter",
                "latitude": 12.8000,
                "longitude": 80.0000,
                "capacity": 400,
                "status": ReliefCentreStatus.ACTIVE
            },
            {
                "name": "Potheri Relief Camp",
                "latitude": 12.8500,
                "longitude": 80.0500,
                "capacity": 350,
                "status": ReliefCentreStatus.ACTIVE
            },
            {
                "name": "Singaperumal Koil Relief Centre",
                "latitude": 12.7500,
                "longitude": 79.9500,
                "capacity": 300,
                "status": ReliefCentreStatus.ACTIVE
            },
            {
                "name": "Padappai Emergency Camp",
                "latitude": 12.9000,
                "longitude": 80.1000,
                "capacity": 250,
                "status": ReliefCentreStatus.ACTIVE
            },
            {
                "name": "Chengalpattu District Relief Centre",
                "latitude": 12.6925,
                "longitude": 79.9770,
                "capacity": 600,
                "status": ReliefCentreStatus.ACTIVE
            },
            {
                "name": "Tambaram Relief Centre",
                "latitude": 12.9250,
                "longitude": 80.1000,
                "capacity": 450,
                "status": ReliefCentreStatus.ACTIVE
            }
        ]
        
        for centre_data in sample_centres:
            centre = ReliefCentre(**centre_data)
            db.add(centre)
        
        db.commit()
        print(f"Successfully seeded {len(sample_centres)} relief centres!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding relief centres: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    from app.database import init_db
    import sys
    
    # Check if --clear flag is provided
    clear_existing = "--clear" in sys.argv or "-c" in sys.argv
    
    print("Initializing database...")
    init_db()
    print("Seeding relief centres...")
    seed_relief_centres(clear_existing=clear_existing)

