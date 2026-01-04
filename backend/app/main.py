from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import route, relief_centre
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup events
    """
    # Initialize database on startup
    init_db()
    yield


app = FastAPI(
    title="Disaster Relief Routing Backend",
    version="0.1",
    lifespan=lifespan
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(route.router)
app.include_router(relief_centre.router)

@app.get("/health")
def health_check():
    return {"status": "Backend running"}
