import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from app.database import get_db
from app.models.flood_models import (
    MonitoringStation,
    WeatherObservation,
    RiverLevelObservation,
    FloodPrediction,
    Alert,
)
from app.schemas.flood_schemas import DashboardSummaryOut, AlertOut, PredictionHistoryOut
from app.config import settings

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_stations = db.query(MonitoringStation).filter(MonitoringStation.is_active == True).count()
    active_alerts = db.query(Alert).filter(Alert.status == "Active").order_by(Alert.created_at.desc()).all()

    stations = db.query(MonitoringStation).filter(MonitoringStation.is_active == True).all()
    station_ids = [st.id for st in stations]

    # Bulk query optimization
    river_sub = db.query(func.max(RiverLevelObservation.id)).filter(RiverLevelObservation.station_id.in_(station_ids)).group_by(RiverLevelObservation.station_id).all()
    river_ids = [r[0] for r in river_sub]
    rivers_map = {r.station_id: r for r in db.query(RiverLevelObservation).filter(RiverLevelObservation.id.in_(river_ids)).all()} if river_ids else {}

    weather_sub = db.query(func.max(WeatherObservation.id)).filter(WeatherObservation.station_id.in_(station_ids)).group_by(WeatherObservation.station_id).all()
    weather_ids = [w[0] for w in weather_sub]
    weathers_map = {w.station_id: w for w in db.query(WeatherObservation).filter(WeatherObservation.id.in_(weather_ids)).all()} if weather_ids else {}

    pred_sub = db.query(func.max(FloodPrediction.id)).filter(FloodPrediction.station_id.in_(station_ids)).group_by(FloodPrediction.station_id).all()
    pred_ids = [p[0] for p in pred_sub]
    preds_map = {p.station_id: p for p in db.query(FloodPrediction).filter(FloodPrediction.id.in_(pred_ids)).all()} if pred_ids else {}

    risk_dist = {"Low": 0, "Moderate": 0, "High": 0, "Critical": 0}
    high_count = 0
    crit_count = 0

    max_water_level = 0.0
    max_station_name = "N/A"
    total_rainfall = 0.0
    stations_with_rain = 0
    last_update = datetime.now(timezone.utc)

    for st in stations:
        latest_pred = preds_map.get(st.id)
        if latest_pred:
            r_level = latest_pred.predicted_risk_level
            risk_dist[r_level] = risk_dist.get(r_level, 0) + 1
            if r_level == "High":
                high_count += 1
            elif r_level == "Critical":
                crit_count += 1

        latest_river = rivers_map.get(st.id)
        if latest_river and latest_river.water_level_m > max_water_level:
            max_water_level = latest_river.water_level_m
            max_station_name = st.name

        latest_weather = weathers_map.get(st.id)
        if latest_weather:
            total_rainfall += latest_weather.rainfall_24h_mm
            stations_with_rain += 1
            if latest_weather.timestamp:
                last_update = latest_weather.timestamp

    mean_rain = round(total_rainfall / max(stations_with_rain, 1), 1)

    # Recent Alerts formatting
    recent_alerts_out = []
    for a in active_alerts[:6]:
        actions = []
        try:
            actions = json.loads(a.recommended_actions_json) if a.recommended_actions_json else []
        except Exception:
            actions = []

        recent_alerts_out.append(AlertOut(
            id=a.id,
            alert_code=a.alert_code,
            station_id=a.station_id,
            station_name=a.station.name if a.station else "N/A",
            basin_name=a.basin_name,
            district=a.district,
            risk_level=a.risk_level,
            reason=a.reason,
            observed_water_level=a.observed_water_level,
            predicted_water_level=a.predicted_water_level,
            threshold_exceeded=a.threshold_exceeded,
            recommended_actions=actions,
            status=a.status,
            created_at=a.created_at,
            acknowledged_at=a.acknowledged_at,
            resolved_at=a.resolved_at,
            acknowledged_by=a.acknowledged_by,
            resolved_by=a.resolved_by,
            is_simulated=a.is_simulated
        ))

    # Recent Predictions
    recent_preds = (
        db.query(FloodPrediction)
        .order_by(FloodPrediction.timestamp.desc())
        .limit(8)
        .all()
    )
    recent_preds_out = []
    for p in recent_preds:
        recent_preds_out.append(PredictionHistoryOut(
            id=p.id,
            station_id=p.station_id,
            station_name=p.station.name if p.station else "N/A",
            district=p.station.district if p.station else "N/A",
            timestamp=p.timestamp,
            predicted_risk_level=p.predicted_risk_level,
            flood_probability=p.flood_probability,
            predicted_water_level_24h=p.predicted_water_level_24h,
            forecast_horizon_hours=p.forecast_horizon_hours,
            model_version=p.model_version
        ))

    return DashboardSummaryOut(
        total_monitoring_stations=total_stations,
        high_risk_stations_count=high_count,
        critical_risk_stations_count=crit_count,
        active_alerts_count=len(active_alerts),
        mean_rainfall_24h_mm=mean_rain,
        max_recorded_level_m=round(max_water_level, 2),
        max_level_station_name=max_station_name,
        last_data_update=last_update,
        data_source_mode="DEMO MODE (Simulated Dataset)" if settings.DEMO_MODE else "LIVE TELEMETRY",
        system_status="Operational",
        risk_distribution=risk_dist,
        recent_alerts=recent_alerts_out,
        recent_predictions=recent_preds_out
    )
