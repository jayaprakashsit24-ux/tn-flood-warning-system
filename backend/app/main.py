from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.flood_models import RiverBasin
from app.routers import (
    health,
    dashboard,
    basins,
    stations,
    observations,
    predictions,
    alerts,
    history,
    model_metrics,
    datasources,
)
from seed_data import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed initial dataset if not present
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(RiverBasin).count() == 0:
            print("Auto-seeding initial database records...")
            seed_database()
    finally:
        db.close()
    yield
    # Shutdown logic if any

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real-Time Flood Prediction and Early Warning System for Tamil Nadu River Basins using Machine Learning.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(basins.router, prefix=settings.API_PREFIX)
app.include_router(stations.router, prefix=settings.API_PREFIX)
app.include_router(observations.router, prefix=settings.API_PREFIX)
app.include_router(predictions.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(history.router, prefix=settings.API_PREFIX)
app.include_router(model_metrics.router, prefix=settings.API_PREFIX)
app.include_router(datasources.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
        "health_check": f"{settings.API_PREFIX}/health",
        "demo_mode": settings.DEMO_MODE,
        "region": "Tamil Nadu River Basins, India",
    }
