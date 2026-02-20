"""
Seed one admin user (and optionally relief centres). Run once after DB is set up.
Usage: python seed_admin.py
Set ADMIN_EMAIL and ADMIN_PASSWORD in env, or they default to admin@relief.local / admin123.
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, init_db
from app.models.user import User, UserRole
from app.models.relief_center import ReliefCenter

def _hash_bcrypt(password: str) -> str:
    import bcrypt
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def _get_password_hash(password: str) -> str:
    try:
        return _hash_bcrypt(password)
    except ImportError:
        from app.services.auth_service import get_password_hash
        return get_password_hash(password)

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@relief.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")


def seed_admin():
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            print(f"Admin already exists: {ADMIN_EMAIL}")
            return
        user = User(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            password_hash=_get_password_hash(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            phone=None,
        )
        db.add(user)
        db.commit()
        print(f"Admin created: {ADMIN_EMAIL}")
    finally:
        db.close()


def seed_relief_centres():
    """Optionally add sample relief centres if none exist."""
    db = SessionLocal()
    try:
        if db.query(ReliefCenter).count() > 0:
            print("Relief centres already exist, skipping.")
            return
        centres = [
            ("Guduvancherry Central Relief Centre", 12.6939, 79.9757),
            ("Maraimalai Nagar Emergency Shelter", 12.8000, 80.0000),
            ("Potheri Relief Camp", 12.8500, 80.0500),
            ("Chengalpattu District Relief Centre", 12.6925, 79.9770),
        ]
        for name, lat, lng in centres:
            db.add(ReliefCenter(name=name, latitude=lat, longitude=lng))
        db.commit()
        print(f"Created {len(centres)} relief centres.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
    seed_relief_centres()
