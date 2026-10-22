import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.flood_models import Alert
from app.schemas.flood_schemas import (
    AlertOut,
    AlertAcknowledgeRequest,
    AlertResolveRequest,
)

router = APIRouter(tags=["Alerts"])

@router.get("/alerts", response_model=List[AlertOut])
def get_alerts(
    status: Optional[str] = Query(None, description="Active, Acknowledged, Resolved"),
    risk_level: Optional[str] = Query(None, description="Critical, High, Moderate, Low"),
    basin_name: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if status:
        query = query.filter(Alert.status.ilike(status))
    if risk_level:
        query = query.filter(Alert.risk_level.ilike(risk_level))
    if basin_name:
        query = query.filter(Alert.basin_name.ilike(f"%{basin_name}%"))

    alerts = query.limit(limit).all()
    results = []
    for a in alerts:
        actions = []
        try:
            actions = json.loads(a.recommended_actions_json) if a.recommended_actions_json else []
        except Exception:
            actions = []

        results.append(AlertOut(
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
    return results

@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(alert_id: int, req: AlertAcknowledgeRequest, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert ID {alert_id} not found")

    alert.status = "Acknowledged"
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = req.acknowledged_by
    db.commit()
    db.refresh(alert)

    actions = []
    try:
        actions = json.loads(alert.recommended_actions_json) if alert.recommended_actions_json else []
    except Exception:
        actions = []

    return AlertOut(
        id=alert.id,
        alert_code=alert.alert_code,
        station_id=alert.station_id,
        station_name=alert.station.name if alert.station else "N/A",
        basin_name=alert.basin_name,
        district=alert.district,
        risk_level=alert.risk_level,
        reason=alert.reason,
        observed_water_level=alert.observed_water_level,
        predicted_water_level=alert.predicted_water_level,
        threshold_exceeded=alert.threshold_exceeded,
        recommended_actions=actions,
        status=alert.status,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
        resolved_at=alert.resolved_at,
        acknowledged_by=alert.acknowledged_by,
        resolved_by=alert.resolved_by,
        is_simulated=alert.is_simulated
    )

@router.post("/alerts/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(alert_id: int, req: AlertResolveRequest, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert ID {alert_id} not found")

    alert.status = "Resolved"
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = req.resolved_by
    alert.reason += f" [RESOLVED: {req.resolution_notes}]"
    db.commit()
    db.refresh(alert)

    actions = []
    try:
        actions = json.loads(alert.recommended_actions_json) if alert.recommended_actions_json else []
    except Exception:
        actions = []

    return AlertOut(
        id=alert.id,
        alert_code=alert.alert_code,
        station_id=alert.station_id,
        station_name=alert.station.name if alert.station else "N/A",
        basin_name=alert.basin_name,
        district=alert.district,
        risk_level=alert.risk_level,
        reason=alert.reason,
        observed_water_level=alert.observed_water_level,
        predicted_water_level=alert.predicted_water_level,
        threshold_exceeded=alert.threshold_exceeded,
        recommended_actions=actions,
        status=alert.status,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
        resolved_at=alert.resolved_at,
        acknowledged_by=alert.acknowledged_by,
        resolved_by=alert.resolved_by,
        is_simulated=alert.is_simulated
    )
