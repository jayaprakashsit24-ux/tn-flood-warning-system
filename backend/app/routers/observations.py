from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.flood_models import (
    WeatherObservation,
    RiverLevelObservation,
    MonitoringStation,
)
from app.schemas.flood_schemas import (
    WeatherObservationOut,
    RiverLevelObservationOut,
    WeatherObservationCreate,
    RiverLevelObservationCreate,
)

router = APIRouter(tags=["Observations"])

@router.get("/observations")
def get_recent_observations(
    station_id: Optional[int] = Query(None),
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db)
):
    query_river = db.query(RiverLevelObservation).order_by(RiverLevelObservation.timestamp.desc())
    query_weather = db.query(WeatherObservation).order_by(WeatherObservation.timestamp.desc())

    if station_id:
        query_river = query_river.filter(RiverLevelObservation.station_id == station_id)
        query_weather = query_weather.filter(WeatherObservation.station_id == station_id)

    rivers = query_river.limit(limit).all()
    weathers = query_weather.limit(limit).all()

    return {
        "river_level_observations": [
            {
                "id": r.id,
                "station_id": r.station_id,
                "station_name": r.station.name if r.station else "N/A",
                "water_level_m": r.water_level_m,
                "rate_of_change_m_hr": r.rate_of_change_m_hr,
                "upstream_water_level_m": r.upstream_water_level_m,
                "reservoir_discharge_cusecs": r.reservoir_discharge_cusecs,
                "danger_status": r.danger_status,
                "data_source": r.data_source,
                "timestamp": r.timestamp.isoformat(),
                "is_simulated": r.is_simulated
            }
            for r in rivers
        ],
        "weather_observations": [
            {
                "id": w.id,
                "station_id": w.station_id,
                "station_name": w.station.name if w.station else "N/A",
                "rainfall_1h_mm": w.rainfall_1h_mm,
                "rainfall_24h_mm": w.rainfall_24h_mm,
                "forecast_rainfall_24h_mm": w.forecast_rainfall_24h_mm,
                "temperature_c": w.temperature_c,
                "humidity_pct": w.humidity_pct,
                "soil_moisture_pct": w.soil_moisture_pct,
                "data_source": w.data_source,
                "timestamp": w.timestamp.isoformat(),
                "is_simulated": w.is_simulated
            }
            for w in weathers
        ]
    }
