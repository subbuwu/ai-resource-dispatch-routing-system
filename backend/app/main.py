from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import auth, requesters, route, relief_centre, relief_request_actions, weather, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Disaster Relief Routing Backend",
    version="0.2",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(requesters.router)
app.include_router(auth.router)
app.include_router(route.router)
app.include_router(relief_centre.router)
app.include_router(relief_request_actions.router)
app.include_router(weather.router)
app.include_router(admin.router)

@app.get("/health")
def health_check():
    return {"status": "Backend running"}
