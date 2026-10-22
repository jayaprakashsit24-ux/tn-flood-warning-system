import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.flood_models import MonitoringStation, Alert
from app.alerts.engine import alert_engine

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database_connected" in data
    assert "ml_model_loaded" in data

def test_get_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_monitoring_stations" in data
    assert data["total_monitoring_stations"] >= 7
    assert "risk_distribution" in data
    assert "Low" in data["risk_distribution"]
    assert "Critical" in data["risk_distribution"]

def test_get_basins():
    response = client.get("/api/basins")
    assert response.status_code == 200
    basins = response.json()
    assert len(basins) >= 5
    cauvery = next((b for b in basins if "Cauvery" in b["name"]), None)
    assert cauvery is not None
    assert cauvery["drainage_area_sq_km"] > 50000

def test_get_stations():
    response = client.get("/api/stations")
    assert response.status_code == 200
    stations = response.json()
    assert len(stations) >= 10
    first = stations[0]
    assert "name" in first
    assert "danger_level_m" in first
    assert "warning_level_m" in first
    assert "current_risk_level" in first

def test_get_station_detail():
    # Fetch first station
    st_res = client.get("/api/stations")
    st_id = st_res.json()[0]["id"]

    response = client.get(f"/api/stations/{st_id}")
    assert response.status_code == 200
    detail = response.json()
    assert detail["id"] == st_id
    assert "danger_level_m" in detail
    assert "latest_weather" in detail
    assert "latest_river_level" in detail

def test_prediction_runner_and_explainability():
    st_res = client.get("/api/stations")
    st_id = st_res.json()[0]["id"]

    # Run prediction scenario with heavy rainfall
    payload = {
        "station_id": st_id,
        "rainfall_24h_mm": 125.0,
        "forecast_rainfall_24h_mm": 80.0,
        "soil_moisture_pct": 85.0
    }
    response = client.post("/api/predictions/run", json=payload)
    assert response.status_code == 200
    pred = response.json()
    assert pred["station_id"] == st_id
    assert pred["predicted_risk_level"] in ["Low", "Moderate", "High", "Critical"]
    assert 0.0 <= pred["flood_probability"] <= 1.0
    assert len(pred["feature_importance"]) > 0
    assert len(pred["recommended_actions"]) > 0
    assert "predicted_water_level_24h" in pred

def test_prediction_invalid_station():
    payload = {
        "station_id": 999999,
        "rainfall_24h_mm": 50.0
    }
    response = client.post("/api/predictions/run", json=payload)
    assert response.status_code == 404

def test_alert_duplicate_suppression():
    db = SessionLocal()
    try:
        station = db.query(MonitoringStation).first()
        assert station is not None

        # Trigger high risk alert
        alert1 = alert_engine.evaluate_and_trigger_alert(
            db=db,
            station=station,
            risk_level="High",
            observed_water_level=station.warning_level_m + 0.5,
            predicted_water_level=station.warning_level_m + 1.0
        )
        assert alert1 is not None

        # Attempt to trigger identical duplicate immediately
        alert2 = alert_engine.evaluate_and_trigger_alert(
            db=db,
            station=station,
            risk_level="High",
            observed_water_level=station.warning_level_m + 0.6,
            predicted_water_level=station.warning_level_m + 1.1
        )
        # Should be suppressed (returns None)
        assert alert2 is None
    finally:
        db.close()

def test_alert_acknowledge_and_resolve():
    alerts_res = client.get("/api/alerts?status=Active")
    alerts = alerts_res.json()
    if alerts:
        a_id = alerts[0]["id"]
        ack_res = client.post(f"/api/alerts/{a_id}/acknowledge", json={"acknowledged_by": "Test Officer"})
        assert ack_res.status_code == 200
        assert ack_res.json()["status"] == "Acknowledged"

        res_res = client.post(f"/api/alerts/{a_id}/resolve", json={"resolved_by": "Test Officer", "resolution_notes": "All levels normal"})
        assert res_res.status_code == 200
        assert res_res.json()["status"] == "Resolved"

def test_model_metrics_endpoint():
    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    metrics = response.json()
    assert "accuracy" in metrics
    assert "f1_weighted" in metrics
    assert "confusion_matrix" in metrics
    assert "regressor_mae" in metrics

def test_data_sources_status():
    response = client.get("/api/datasources/status")
    assert response.status_code == 200
    sources = response.json()
    assert len(sources) >= 3
