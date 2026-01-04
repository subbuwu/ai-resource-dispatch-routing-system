"""
Database setup for relief centres using SQLite (lightweight, no external setup required)
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import enum
import os

# SQLite database file path
DATABASE_PATH = os.getenv("DATABASE_PATH", "relief_centres.db")
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    echo=False
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class ReliefCentreStatus(str, enum.Enum):
    """Relief centre status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"


class ReliefCentre(Base):
    """
    Relief centre model for storing disaster relief centre information
    """
    __tablename__ = "relief_centres"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=True)  # Maximum capacity (optional)
    status = Column(
        SQLEnum(ReliefCentreStatus, native_enum=False),
        nullable=False,
        default=ReliefCentreStatus.ACTIVE,
        index=True
    )
    
    def __repr__(self):
        return f"<ReliefCentre(name={self.name}, lat={self.latitude}, lng={self.longitude}, status={self.status})>"


def get_db():
    """
    Dependency function for FastAPI to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database - create all tables
    Run this once to set up the database schema
    """
    Base.metadata.create_all(bind=engine)

