from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.flood_models import RiverBasin, MonitoringStation
from app.schemas.flood_schemas import RiverBasinOut

router = APIRouter(tags=["Basins"])

@router.get("/basins", response_model=List[RiverBasinOut])
def get_basins(db: Session = Depends(get_db)):
    basins = db.query(RiverBasin).all()
    results = []
    for b in basins:
        cnt = db.query(MonitoringStation).filter(MonitoringStation.basin_id == b.id, MonitoringStation.is_active == True).count()
        results.append(RiverBasinOut(
            id=b.id,
            code=b.code,
            name=b.name,
            description=b.description,
            drainage_area_sq_km=b.drainage_area_sq_km,
            primary_districts=b.primary_districts,
            origin=b.origin,
            outflow=b.outflow,
            is_interstate=b.is_interstate,
            color_hex=b.color_hex,
            station_count=cnt
        ))
    return results
