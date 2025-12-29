from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import route

app = FastAPI(
    title="Disaster Relief Routing Backend",
    version="0.1"
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

@app.get("/health")
def health_check():
    return {"status": "Backend running"}
