import json
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.flood_models import (
    MonitoringStation,
    WeatherObservation,
    RiverLevelObservation,
    FloodPrediction,
    Alert,
)
from app.schemas.flood_schemas import MonitoringStationOut, MonitoringStationDetail

router = APIRouter(tags=["Stations"])

@router.get("/stations", response_model=List[MonitoringStationOut])
def get_stations(
    basin_id: Optional[int] = Query(None, description="Filter by River Basin ID"),
    district: Optional[str] = Query(None, description="Filter by District"),
    risk_level: Optional[str] = Query(None, description="Filter by Risk Level: Low, Moderate, High, Critical"),
    db: Session = Depends(get_db)
):
    query = db.query(MonitoringStation).filter(MonitoringStation.is_active == True)
    if basin_id:
        query = query.filter(MonitoringStation.basin_id == basin_id)
    if district:
        query = query.filter(MonitoringStation.district.ilike(f"%{district}%"))

    stations = query.all()
    if not stations:
        return []

    station_ids = [st.id for st in stations]

    # Ultra-fast bulk lookups (3 fast SQL queries instead of 66 sequential queries)
    river_sub = db.query(func.max(RiverLevelObservation.id)).filter(RiverLevelObservation.station_id.in_(station_ids)).group_by(RiverLevelObservation.station_id).all()
    river_ids = [r[0] for r in river_sub]
    rivers_map = {r.station_id: r for r in db.query(RiverLevelObservation).filter(RiverLevelObservation.id.in_(river_ids)).all()} if river_ids else {}

    weather_sub = db.query(func.max(WeatherObservation.id)).filter(WeatherObservation.station_id.in_(station_ids)).group_by(WeatherObservation.station_id).all()
    weather_ids = [w[0] for w in weather_sub]
    weathers_map = {w.station_id: w for w in db.query(WeatherObservation).filter(WeatherObservation.id.in_(weather_ids)).all()} if weather_ids else {}

    pred_sub = db.query(func.max(FloodPrediction.id)).filter(FloodPrediction.station_id.in_(station_ids)).group_by(FloodPrediction.station_id).all()
    pred_ids = [p[0] for p in pred_sub]
    preds_map = {p.station_id: p for p in db.query(FloodPrediction).filter(FloodPrediction.id.in_(pred_ids)).all()} if pred_ids else {}

    results = []
    for st in stations:
        latest_river = rivers_map.get(st.id)
        latest_weather = weathers_map.get(st.id)
        latest_pred = preds_map.get(st.id)

        wl = latest_river.water_level_m if latest_river else st.zero_gauge_m
        rain = latest_weather.rainfall_24h_mm if latest_weather else 0.0
        current_risk = latest_pred.predicted_risk_level if latest_pred else "Low"
        danger_ratio = round(wl / max(st.danger_level_m, 0.1), 3)

        if risk_level and current_risk.lower() != risk_level.lower():
            continue

        results.append(MonitoringStationOut(
            id=st.id,
            station_code=st.station_code,
            name=st.name,
            basin_id=st.basin_id,
            basin_name=st.basin.name if st.basin else "N/A",
            river_name=st.river_name,
            district=st.district,
            latitude=st.latitude,
            longitude=st.longitude,
            zero_gauge_m=st.zero_gauge_m,
            warning_level_m=st.warning_level_m,
            danger_level_m=st.danger_level_m,
            highest_flood_level_m=st.highest_flood_level_m,
            hfl_date=st.hfl_date,
            station_type=st.station_type,
            is_active=st.is_active,
            current_water_level=round(wl, 2),
            current_rainfall_24h=round(rain, 1),
            danger_ratio=danger_ratio,
            current_risk_level=current_risk,
            last_updated=latest_river.timestamp if latest_river else st.last_updated
        ))

    return results

@router.get("/stations/{station_id}", response_model=MonitoringStationDetail)
def get_station_detail(station_id: int, db: Session = Depends(get_db)):
    st = db.query(MonitoringStation).filter(MonitoringStation.id == station_id).first()
    if not st:
        raise HTTPException(status_code=404, detail=f"Station with ID {station_id} not found")

    latest_river = (
        db.query(RiverLevelObservation)
        .filter(RiverLevelObservation.station_id == st.id)
        .order_by(RiverLevelObservation.id.desc())
        .first()
    )
    latest_weather = (
        db.query(WeatherObservation)
        .filter(WeatherObservation.station_id == st.id)
        .order_by(WeatherObservation.id.desc())
        .first()
    )
    latest_pred = (
        db.query(FloodPrediction)
        .filter(FloodPrediction.station_id == st.id)
        .order_by(FloodPrediction.id.desc())
        .first()
    )
    alerts = (
        db.query(Alert)
        .filter(Alert.station_id == st.id, Alert.status == "Active")
        .all()
    )

    wl = latest_river.water_level_m if latest_river else st.zero_gauge_m
    rain = latest_weather.rainfall_24h_mm if latest_weather else 0.0
    current_risk = latest_pred.predicted_risk_level if latest_pred else "Low"

    weather_dict = None
    if latest_weather:
        weather_dict = {
            "rainfall_1h_mm": latest_weather.rainfall_1h_mm,
            "rainfall_3h_mm": latest_weather.rainfall_3h_mm,
            "rainfall_6h_mm": latest_weather.rainfall_6h_mm,
            "rainfall_12h_mm": latest_weather.rainfall_12h_mm,
            "rainfall_24h_mm": latest_weather.rainfall_24h_mm,
            "rainfall_72h_mm": latest_weather.rainfall_72h_mm,
            "forecast_rainfall_24h_mm": latest_weather.forecast_rainfall_24h_mm,
            "temperature_c": latest_weather.temperature_c,
            "humidity_pct": latest_weather.humidity_pct,
            "soil_moisture_pct": latest_weather.soil_moisture_pct,
            "data_source": latest_weather.data_source,
            "timestamp": latest_weather.timestamp.isoformat()
        }

    river_dict = None
    if latest_river:
        river_dict = {
            "water_level_m": latest_river.water_level_m,
            "rate_of_change_m_hr": latest_river.rate_of_change_m_hr,
            "upstream_water_level_m": latest_river.upstream_water_level_m,
            "reservoir_discharge_cusecs": latest_river.reservoir_discharge_cusecs,
            "flow_velocity_m_s": latest_river.flow_velocity_m_s,
            "danger_status": latest_river.danger_status,
            "data_source": latest_river.data_source,
            "timestamp": latest_river.timestamp.isoformat()
        }

    pred_dict = None
    if latest_pred:
        fi = []
        try:
            fi = json.loads(latest_pred.feature_importance_json) if latest_pred.feature_importance_json else []
        except Exception:
            fi = []
        ra = []
        try:
            ra = json.loads(latest_pred.recommended_actions_json) if latest_pred.recommended_actions_json else []
        except Exception:
            ra = []

        pred_dict = {
            "predicted_risk_level": latest_pred.predicted_risk_level,
            "flood_probability": latest_pred.flood_probability,
            "predicted_water_level_24h": latest_pred.predicted_water_level_24h,
            "forecast_horizon_hours": latest_pred.forecast_horizon_hours,
            "model_version": latest_pred.model_version,
            "feature_importance": fi,
            "recommended_actions": ra,
            "timestamp": latest_pred.timestamp.isoformat()
        }

    alerts_list = []
    for a in alerts:
        alerts_list.append({
            "id": a.id,
            "alert_code": a.alert_code,
            "risk_level": a.risk_level,
            "reason": a.reason,
            "status": a.status,
            "created_at": a.created_at.isoformat()
        })

    return MonitoringStationDetail(
        id=st.id,
        station_code=st.station_code,
        name=st.name,
        basin_id=st.basin_id,
        basin_name=st.basin.name if st.basin else "N/A",
        river_name=st.river_name,
        district=st.district,
        latitude=st.latitude,
        longitude=st.longitude,
        zero_gauge_m=st.zero_gauge_m,
        warning_level_m=st.warning_level_m,
        danger_level_m=st.danger_level_m,
        highest_flood_level_m=st.highest_flood_level_m,
        hfl_date=st.hfl_date,
        station_type=st.station_type,
        is_active=st.is_active,
        current_water_level=round(wl, 2),
        current_rainfall_24h=round(rain, 1),
        danger_ratio=round(wl / max(st.danger_level_m, 0.1), 3),
        current_risk_level=current_risk,
        last_updated=latest_river.timestamp if latest_river else st.last_updated,
        latest_weather=weather_dict,
        latest_river_level=river_dict,
        latest_prediction=pred_dict,
        active_alerts=alerts_list
    )
