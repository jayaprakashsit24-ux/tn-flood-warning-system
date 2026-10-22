import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.flood_models import (
    MonitoringStation,
    WeatherObservation,
    RiverLevelObservation,
    FloodPrediction,
    Alert,
)
from app.schemas.flood_schemas import (
    PredictionRequest,
    PredictionResponse,
    PredictionHistoryOut,
    FeatureImportanceItem,
)
from app.ml.model import flood_model
from app.alerts.engine import alert_engine

router = APIRouter(tags=["Predictions"])

@router.get("/predictions", response_model=List[PredictionHistoryOut])
def get_predictions(
    station_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(FloodPrediction).order_by(FloodPrediction.timestamp.desc())
    if station_id:
        query = query.filter(FloodPrediction.station_id == station_id)

    preds = query.limit(limit).all()
    results = []
    for p in preds:
        results.append(PredictionHistoryOut(
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
    return results

@router.post("/predictions/run", response_model=PredictionResponse)
def run_prediction(req: PredictionRequest, db: Session = Depends(get_db)):
    station = db.query(MonitoringStation).filter(MonitoringStation.id == req.station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Station ID {req.station_id} not found")

    # Fetch latest observations as baseline
    latest_w = (
        db.query(WeatherObservation)
        .filter(WeatherObservation.station_id == station.id)
        .order_by(WeatherObservation.id.desc())
        .first()
    )
    latest_r = (
        db.query(RiverLevelObservation)
        .filter(RiverLevelObservation.station_id == station.id)
        .order_by(RiverLevelObservation.id.desc())
        .first()
    )

    # Merge request overrides with latest baseline telemetry
    w_dict = {
        "rainfall_1h_mm": req.rainfall_1h_mm if req.rainfall_1h_mm is not None else (latest_w.rainfall_1h_mm if latest_w else 0.0),
        "rainfall_3h_mm": req.rainfall_3h_mm if req.rainfall_3h_mm is not None else (latest_w.rainfall_3h_mm if latest_w else 0.0),
        "rainfall_6h_mm": req.rainfall_6h_mm if req.rainfall_6h_mm is not None else (latest_w.rainfall_6h_mm if latest_w else 0.0),
        "rainfall_12h_mm": req.rainfall_12h_mm if req.rainfall_12h_mm is not None else (latest_w.rainfall_12h_mm if latest_w else 0.0),
        "rainfall_24h_mm": req.rainfall_24h_mm if req.rainfall_24h_mm is not None else (latest_w.rainfall_24h_mm if latest_w else 0.0),
        "rainfall_72h_mm": req.rainfall_72h_mm if req.rainfall_72h_mm is not None else (latest_w.rainfall_72h_mm if latest_w else 0.0),
        "forecast_rainfall_24h_mm": req.forecast_rainfall_24h_mm if req.forecast_rainfall_24h_mm is not None else (latest_w.forecast_rainfall_24h_mm if latest_w else 0.0),
        "temperature_c": req.temperature_c if req.temperature_c is not None else (latest_w.temperature_c if latest_w else 28.0),
        "humidity_pct": req.humidity_pct if req.humidity_pct is not None else (latest_w.humidity_pct if latest_w else 75.0),
        "soil_moisture_pct": req.soil_moisture_pct if req.soil_moisture_pct is not None else (latest_w.soil_moisture_pct if latest_w else 50.0),
    }

    # Hydrological sanity check: prevent 0 m level from overriding high-altitude/MSL zero gauges
    req_water_level = req.current_water_level
    if req_water_level is None or (req_water_level <= 0 and station.zero_gauge_m > 5):
        if latest_r and latest_r.water_level_m > 0:
            req_water_level = latest_r.water_level_m
        else:
            req_water_level = round(station.zero_gauge_m + (station.warning_level_m - station.zero_gauge_m) * 0.45, 2)

    r_dict = {
        "water_level_m": req_water_level,
        "rate_of_change_m_hr": req.rate_of_change_m_hr if req.rate_of_change_m_hr is not None else (latest_r.rate_of_change_m_hr if latest_r else 0.0),
        "upstream_water_level_m": req.upstream_water_level if req.upstream_water_level is not None else (latest_r.upstream_water_level_m if latest_r else station.zero_gauge_m + 0.5),
        "reservoir_discharge_cusecs": req.reservoir_discharge_cusecs if req.reservoir_discharge_cusecs is not None else (latest_r.reservoir_discharge_cusecs if latest_r else 1200.0),
    }

    # Run ML Inference
    result = flood_model.predict(
        weather_dict=w_dict,
        river_dict=r_dict,
        station_danger_level=station.danger_level_m,
        station_warning_level=station.warning_level_m,
        station_name=station.name,
        river_name=station.river_name
    )

    now = datetime.now(timezone.utc)

    # Persist updated observations in DB so station telemetry across Map, Live Monitoring & Dashboard immediately updates!
    new_weather = WeatherObservation(
        station_id=station.id,
        timestamp=now,
        rainfall_1h_mm=w_dict["rainfall_1h_mm"],
        rainfall_3h_mm=w_dict["rainfall_3h_mm"],
        rainfall_6h_mm=w_dict["rainfall_6h_mm"],
        rainfall_12h_mm=w_dict["rainfall_12h_mm"],
        rainfall_24h_mm=w_dict["rainfall_24h_mm"],
        rainfall_72h_mm=w_dict["rainfall_72h_mm"],
        forecast_rainfall_24h_mm=w_dict["forecast_rainfall_24h_mm"],
        temperature_c=w_dict["temperature_c"],
        humidity_pct=w_dict["humidity_pct"],
        soil_moisture_pct=w_dict["soil_moisture_pct"],
        data_source="Interactive Prediction Telemetry",
        is_simulated=True
    )
    db.add(new_weather)

    new_river = RiverLevelObservation(
        station_id=station.id,
        timestamp=now,
        water_level_m=r_dict["water_level_m"],
        rate_of_change_m_hr=r_dict["rate_of_change_m_hr"],
        upstream_water_level_m=r_dict["upstream_water_level_m"],
        reservoir_discharge_cusecs=r_dict["reservoir_discharge_cusecs"],
        flow_velocity_m_s=1.8,
        danger_status="Danger" if r_dict["water_level_m"] >= station.danger_level_m else ("Warning" if r_dict["water_level_m"] >= station.warning_level_m else "Normal"),
        data_source="Interactive Prediction Telemetry",
        is_simulated=True
    )
    db.add(new_river)
    station.last_updated = now

    # Persist prediction in DB
    fi_json = json.dumps(result["feature_importance"])
    ra_json = json.dumps(result["recommended_actions"])
    prediction_record = FloodPrediction(
        station_id=station.id,
        timestamp=now,
        predicted_risk_level=result["predicted_risk_level"],
        flood_probability=result["flood_probability"],
        predicted_water_level_24h=result["predicted_water_level_24h"],
        forecast_horizon_hours=24,
        model_version=result["model_version"],
        feature_importance_json=fi_json,
        recommended_actions_json=ra_json,
        data_freshness_minutes=result["data_freshness_minutes"],
        is_reliable=result["is_reliable"],
        is_simulated=result["is_simulated"]
    )
    db.add(prediction_record)

    # Check alert trigger or resolution
    created_alert = None
    if result["predicted_risk_level"] in ["High", "Critical"]:
        alert_obj = alert_engine.evaluate_and_trigger_alert(
            db=db,
            station=station,
            risk_level=result["predicted_risk_level"],
            observed_water_level=r_dict["water_level_m"],
            predicted_water_level=result["predicted_water_level_24h"]
        )
        if alert_obj:
            created_alert = {
                "id": alert_obj.id,
                "alert_code": alert_obj.alert_code,
                "risk_level": alert_obj.risk_level,
                "reason": alert_obj.reason,
                "status": alert_obj.status
            }
    else:
        # If simulated conditions return to Low or Moderate, resolve any previous Active alerts for this station
        active_station_alerts = db.query(Alert).filter(Alert.station_id == station.id, Alert.status == "Active").all()
        for a in active_station_alerts:
            a.status = "Resolved"
            a.resolved_at = now
            a.resolved_by = "Simulation Protocol (Receded Flow)"
            a.reason += " [Auto-Resolved: Prediction simulated normal/safe hydrological conditions]"

    db.commit()
    db.refresh(prediction_record)

    # Map feature importance items to Pydantic objects
    fi_items = [
        FeatureImportanceItem(
            feature=item["feature"],
            label=item["label"],
            importance=item["importance"],
            value=item["value"]
        )
        for item in result["feature_importance"]
    ]

    return PredictionResponse(
        station_id=station.id,
        station_name=station.name,
        basin_name=station.basin.name if station.basin else "N/A",
        district=station.district,
        timestamp=now,
        predicted_risk_level=result["predicted_risk_level"],
        flood_probability=result["flood_probability"],
        predicted_water_level_24h=result["predicted_water_level_24h"],
        warning_level_m=station.warning_level_m,
        danger_level_m=station.danger_level_m,
        hfl_m=station.highest_flood_level_m,
        forecast_horizon_hours=24,
        model_version=result["model_version"],
        feature_importance=fi_items,
        recommended_actions=result["recommended_actions"],
        data_freshness_minutes=result["data_freshness_minutes"],
        is_reliable=result["is_reliable"],
        is_simulated=result["is_simulated"],
        created_alert=created_alert
    )
