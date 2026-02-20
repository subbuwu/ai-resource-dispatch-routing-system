"""
Script to seed sample relief centres into the database
Run this once to populate the database with initial data
"""
from app.database import SessionLocal, ReliefCenter

def seed_relief_centres(clear_existing=False):
    """Add sample relief centres to the database"""
    db = SessionLocal()
    
    try:
        # Clear existing centres if requested
        existing = db.query(ReliefCenter).count()
        if existing > 0:
            if clear_existing:
                print(f"Removing {existing} existing relief centres...")
                db.query(ReliefCenter).delete()
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
                "longitude": 79.9757
            },
            {
                "name": "Maraimalai Nagar Emergency Shelter",
                "latitude": 12.8000,
                "longitude": 80.0000
            },
            {
                "name": "Potheri Relief Camp",
                "latitude": 12.8500,
                "longitude": 80.0500
            },
            {
                "name": "Singaperumal Koil Relief Centre",
                "latitude": 12.7500,
                "longitude": 79.9500
            },
            {
                "name": "Padappai Emergency Camp",
                "latitude": 12.9000,
                "longitude": 80.1000
            },
            {
                "name": "Chengalpattu District Relief Centre",
                "latitude": 12.6925,
                "longitude": 79.9770
            },
            {
                "name": "Tambaram Relief Centre",
                "latitude": 12.9250,
                "longitude": 80.1000
            }
        ]
        
        for centre_data in sample_centres:
            centre = ReliefCenter(**centre_data)
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

