from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.flood_models import DataSourceStatus
from app.schemas.flood_schemas import DataSourceStatusOut

router = APIRouter(tags=["Data Sources"])

@router.get("/datasources/status", response_model=List[DataSourceStatusOut])
def get_data_sources_status(db: Session = Depends(get_db)):
    statuses = db.query(DataSourceStatus).all()
    return statuses
