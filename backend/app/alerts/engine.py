import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.config import settings
from app.models.flood_models import Alert, MonitoringStation
from app.alerts.notification_service import notification_service
from app.ml.features import generate_safety_recommendations

class AlertEngine:
    """Configurable early warning and alert evaluation engine."""

    def __init__(self):
        self.suppression_hours = settings.ALERT_DUPLICATE_WINDOW_HOURS

    def evaluate_and_trigger_alert(
        self,
        db: Session,
        station: MonitoringStation,
        risk_level: str,
        observed_water_level: float,
        predicted_water_level: float,
        reason: Optional[str] = None
    ) -> Optional[Alert]:
        """Check thresholds, apply duplicate suppression, and record alert."""
        # Only High and Critical automatically trigger active early warnings
        # Moderate can trigger a watch advisory if gauge is rising rapidly
        if risk_level not in ["High", "Critical"]:
            return None

        now = datetime.now(timezone.utc)
        suppression_cutoff = now - timedelta(hours=self.suppression_hours)

        # 1. Duplicate Alert Suppression Check
        existing_alert = (
            db.query(Alert)
            .filter(
                Alert.station_id == station.id,
                Alert.status == "Active",
                Alert.created_at >= suppression_cutoff,
            )
            .first()
        )

        if existing_alert:
            # If the risk level escalated from High to Critical, update existing alert
            if existing_alert.risk_level == "High" and risk_level == "Critical":
                existing_alert.risk_level = "Critical"
                existing_alert.observed_water_level = observed_water_level
                existing_alert.predicted_water_level = predicted_water_level
                existing_alert.reason = (
                    f"ESCALATION: Water level has breached critical thresholds. "
                    f"Observed: {observed_water_level}m (Danger: {station.danger_level_m}m). "
                    f"Predicted 24h: {predicted_water_level}m."
                )
                actions = generate_safety_recommendations("Critical", station.name, station.river_name)
                existing_alert.recommended_actions_json = json.dumps(actions)
                db.commit()
                db.refresh(existing_alert)
                notification_service.dispatch_alert({
                    "alert_code": existing_alert.alert_code,
                    "risk_level": "Critical",
                    "station_name": station.name,
                    "reason": existing_alert.reason
                })
                return existing_alert
            else:
                # Suppress duplicate alert
                return None

        # 2. Determine Threshold Exceeded Description
        if observed_water_level >= station.danger_level_m:
            thresh_desc = f"Observed level ({observed_water_level}m) exceeded Danger Level ({station.danger_level_m}m)"
        elif predicted_water_level >= station.danger_level_m:
            thresh_desc = f"Predicted 24h level ({predicted_water_level}m) breaches Danger Level ({station.danger_level_m}m)"
        elif observed_water_level >= station.warning_level_m:
            thresh_desc = f"Observed level ({observed_water_level}m) exceeded Warning Level ({station.warning_level_m}m)"
        else:
            thresh_desc = f"Predicted flood surge ratio: {risk_level} Risk Category"

        if not reason:
            reason = (
                f"{risk_level} Flood Risk Warning for {station.name} on River {station.river_name} "
                f"({station.district} District). {thresh_desc}."
            )

        # 3. Create Unique Alert
        code_prefix = station.station_code.split("-")[0] if "-" in station.station_code else "TN"
        alert_code = f"ALT-{code_prefix}-{now.strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:4].upper()}"
        actions = generate_safety_recommendations(risk_level, station.name, station.river_name)

        new_alert = Alert(
            alert_code=alert_code,
            station_id=station.id,
            basin_name=station.basin.name if station.basin else "Tamil Nadu River Basin",
            district=station.district,
            risk_level=risk_level,
            reason=reason,
            observed_water_level=observed_water_level,
            predicted_water_level=predicted_water_level,
            threshold_exceeded=thresh_desc,
            recommended_actions_json=json.dumps(actions),
            status="Active",
            created_at=now,
            is_simulated=settings.DEMO_MODE
        )

        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        notification_service.dispatch_alert({
            "alert_code": new_alert.alert_code,
            "risk_level": risk_level,
            "station_name": station.name,
            "reason": reason
        })

        return new_alert

alert_engine = AlertEngine()
