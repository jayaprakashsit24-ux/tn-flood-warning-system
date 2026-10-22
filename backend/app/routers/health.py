from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone

from app.database import get_db
from app.ml.model import flood_model
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok and flood_model.is_ready() else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": db_ok,
        "ml_model_loaded": flood_model.is_ready(),
        "mode": "DEMO MODE (Simulated Dataset)" if settings.DEMO_MODE else "LIVE PRODUCTION",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
