import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import Base, engine
from api.routes import router
from api.dashboard_routes import router as dashboard_router
from scheduler.sync_scheduler import start_scheduler

# Setup basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gravio Schoology Sync MVP")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")
app.include_router(dashboard_router, prefix="/api/dashboard")

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Gravio Backend...")
    start_scheduler()

@app.get("/health")
def read_health():
    return {"status": "ok", "service": "gravio-schoology-sync"}

# For running directly with `python main.py`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
