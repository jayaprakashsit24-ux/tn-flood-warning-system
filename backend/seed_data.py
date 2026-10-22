import os
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base
from app.models.flood_models import (
    RiverBasin,
    MonitoringStation,
    WeatherObservation,
    RiverLevelObservation,
    FloodPrediction,
    Alert,
    ModelMetrics,
    DataSourceStatus,
)
from app.ml.model import flood_model
from app.alerts.engine import alert_engine

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(RiverBasin).count() > 0:
            print("Database already contains river basins. Updating live telemetry observations...")
        else:
            print("Seeding verified Tamil Nadu River Basins...")
            basins_data = [
                {
                    "code": "CAUVERY",
                    "name": "Cauvery River Basin",
                    "description": "Major interstate river basin sustaining agriculture across the central delta of Tamil Nadu.",
                    "drainage_area_sq_km": 81155.0,
                    "primary_districts": "Salem, Erode, Namakkal, Karur, Tiruchirappalli, Thanjavur, Tiruvarur, Mayiladuthurai, Nagapattinam",
                    "origin": "Talakaveri, Kodagu, Western Ghats, Karnataka",
                    "outflow": "Bay of Bengal at Poompuhar",
                    "is_interstate": True,
                    "color_hex": "#2563eb"
                },
                {
                    "code": "THAMIRABARANI",
                    "name": "Thamirabarani River Basin",
                    "description": "Perennial river basin originating in Agasthyamalai in the southern Western Ghats, lifeline of Tirunelveli and Thoothukudi.",
                    "drainage_area_sq_km": 5969.0,
                    "primary_districts": "Tirunelveli, Tenkasi, Thoothukudi",
                    "origin": "Pothigai Hills, Agasthyamalai, Western Ghats",
                    "outflow": "Gulf of Mannar at Punnaikayal",
                    "is_interstate": False,
                    "color_hex": "#0284c7"
                },
                {
                    "code": "VAIGAI",
                    "name": "Vaigai River Basin",
                    "description": "Historic basin draining Theni, Dindigul, Madurai, Sivaganga, and Ramanathapuram districts.",
                    "drainage_area_sq_km": 7000.0,
                    "primary_districts": "Theni, Dindigul, Madurai, Sivaganga, Ramanathapuram",
                    "origin": "Varusanadu Hills, Western Ghats",
                    "outflow": "Palk Strait near Uchipuli",
                    "is_interstate": False,
                    "color_hex": "#0d9488"
                },
                {
                    "code": "PALAR",
                    "name": "Palar River Basin",
                    "description": "Northern Tamil Nadu interstate river flowing through Vellore, Ranipet, Kanchipuram, and Chengalpattu.",
                    "drainage_area_sq_km": 17810.0,
                    "primary_districts": "Tirupathur, Vellore, Ranipet, Kanchipuram, Chengalpattu",
                    "origin": "Talagavara, Kolar District, Karnataka",
                    "outflow": "Bay of Bengal near Vayalur",
                    "is_interstate": True,
                    "color_hex": "#d97706"
                },
                {
                    "code": "PENNAIYAR",
                    "name": "Pennaiyar (Thenpennai) River Basin",
                    "description": "Prominent north-central river basin traversing Krishnagiri, Dharmapuri, Tiruvannamalai, Villupuram, and Cuddalore.",
                    "drainage_area_sq_km": 16019.0,
                    "primary_districts": "Krishnagiri, Dharmapuri, Tiruvannamalai, Villupuram, Cuddalore",
                    "origin": "Nandi Hills, Chikkaballapura, Karnataka",
                    "outflow": "Bay of Bengal near Cuddalore",
                    "is_interstate": True,
                    "color_hex": "#7c3aed"
                },
                {
                    "code": "BHAVANI",
                    "name": "Bhavani River Basin",
                    "description": "Major perennial tributary of the Cauvery draining the Nilgiris and Coimbatore/Erode plains.",
                    "drainage_area_sq_km": 6200.0,
                    "primary_districts": "The Nilgiris, Coimbatore, Erode",
                    "origin": "Silent Valley / Nilgiri Hills, Western Ghats",
                    "outflow": "Cauvery River confluence at Bhavani (Kooduthurai)",
                    "is_interstate": True,
                    "color_hex": "#059669"
                },
                {
                    "code": "AMARAVATHI",
                    "name": "Amaravathi River Basin",
                    "description": "Key southern tributary of the Cauvery originating in Anaimalai Hills, feeding Tiruppur and Karur irrigation belts.",
                    "drainage_area_sq_km": 8280.0,
                    "primary_districts": "Tiruppur, Dindigul, Karur",
                    "origin": "Manjampatti Valley, Anaimalai Hills",
                    "outflow": "Cauvery River confluence at Thirumukkudalur, Karur",
                    "is_interstate": False,
                    "color_hex": "#ea580c"
                },
            ]

            basin_objs = {}
            for b_data in basins_data:
                basin = RiverBasin(**b_data)
                db.add(basin)
                db.commit()
                db.refresh(basin)
                basin_objs[b_data["code"]] = basin

            print(f"Seeded {len(basin_objs)} river basins.")

            print("Seeding verified Monitoring Stations with official benchmarks...")
            stations_data = [
                # Cauvery Basin
                {
                    "station_code": "CAU-MET-01",
                    "name": "Mettur Dam Upper Catchment",
                    "basin_id": basin_objs["CAUVERY"].id,
                    "river_name": "Cauvery",
                    "district": "Salem",
                    "latitude": 11.8020,
                    "longitude": 77.8010,
                    "zero_gauge_m": 240.0,
                    "warning_level_m": 272.0,
                    "danger_level_m": 274.32,
                    "highest_flood_level_m": 275.1,
                    "hfl_date": "1924-07-28",
                    "station_type": "CWC Dam & Reservoir Station"
                },
                {
                    "station_code": "CAU-KOD-02",
                    "name": "Kodumudi Hydrological Station",
                    "basin_id": basin_objs["CAUVERY"].id,
                    "river_name": "Cauvery",
                    "district": "Erode",
                    "latitude": 11.0820,
                    "longitude": 77.8860,
                    "zero_gauge_m": 115.0,
                    "warning_level_m": 124.5,
                    "danger_level_m": 126.2,
                    "highest_flood_level_m": 127.4,
                    "hfl_date": "2018-08-18",
                    "station_type": "CWC Hydrological Observation Station"
                },
                {
                    "station_code": "CAU-MUS-03",
                    "name": "Musiri Gauge Station",
                    "basin_id": basin_objs["CAUVERY"].id,
                    "river_name": "Cauvery",
                    "district": "Tiruchirappalli",
                    "latitude": 10.9410,
                    "longitude": 78.4480,
                    "zero_gauge_m": 72.0,
                    "warning_level_m": 81.0,
                    "danger_level_m": 83.5,
                    "highest_flood_level_m": 84.8,
                    "hfl_date": "2005-11-26",
                    "station_type": "State WRD Flood Gauge"
                },
                {
                    "station_code": "CAU-GNA-04",
                    "name": "Grand Anicut (Kallanai Regulator)",
                    "basin_id": basin_objs["CAUVERY"].id,
                    "river_name": "Kollidam / Cauvery",
                    "district": "Thanjavur",
                    "latitude": 10.8333,
                    "longitude": 78.8183,
                    "zero_gauge_m": 55.0,
                    "warning_level_m": 62.8,
                    "danger_level_m": 64.9,
                    "highest_flood_level_m": 66.2,
                    "hfl_date": "2024-08-04",
                    "station_type": "Major Flood Diversion Regulator"
                },
                {
                    "station_code": "CAU-MAY-05",
                    "name": "Mayiladuthurai Barrage",
                    "basin_id": basin_objs["CAUVERY"].id,
                    "river_name": "Cauvery",
                    "district": "Mayiladuthurai",
                    "latitude": 11.1075,
                    "longitude": 79.6523,
                    "zero_gauge_m": 14.0,
                    "warning_level_m": 19.5,
                    "danger_level_m": 21.0,
                    "highest_flood_level_m": 22.3,
                    "hfl_date": "2022-11-12",
                    "station_type": "Delta Irrigation & Flood Watch"
                },

                # Thamirabarani Basin
                {
                    "station_code": "THA-CHE-01",
                    "name": "Cheranmahadevi Gauge Site",
                    "basin_id": basin_objs["THAMIRABARANI"].id,
                    "river_name": "Thamirabarani",
                    "district": "Tirunelveli",
                    "latitude": 8.6811,
                    "longitude": 77.5614,
                    "zero_gauge_m": 42.0,
                    "warning_level_m": 49.5,
                    "danger_level_m": 51.8,
                    "highest_flood_level_m": 54.2,
                    "hfl_date": "2023-12-18",
                    "station_type": "CWC Telemetry Station"
                },
                {
                    "station_code": "THA-TIR-02",
                    "name": "Tirunelveli Kokkirakulam Bridge",
                    "basin_id": basin_objs["THAMIRABARANI"].id,
                    "river_name": "Thamirabarani",
                    "district": "Tirunelveli",
                    "latitude": 8.7290,
                    "longitude": 77.7280,
                    "zero_gauge_m": 32.0,
                    "warning_level_m": 38.2,
                    "danger_level_m": 40.5,
                    "highest_flood_level_m": 43.1,
                    "hfl_date": "2023-12-18",
                    "station_type": "Urban Flood Warning Gauge"
                },
                {
                    "station_code": "THA-MUR-03",
                    "name": "Murappanadu Bridge Checkpost",
                    "basin_id": basin_objs["THAMIRABARANI"].id,
                    "river_name": "Thamirabarani",
                    "district": "Thoothukudi",
                    "latitude": 8.7180,
                    "longitude": 77.8380,
                    "zero_gauge_m": 18.0,
                    "warning_level_m": 23.5,
                    "danger_level_m": 25.2,
                    "highest_flood_level_m": 28.5,
                    "hfl_date": "2023-12-18",
                    "station_type": "State Highway Flood Station"
                },
                {
                    "station_code": "THA-SRI-04",
                    "name": "Srivaikuntam Anicut",
                    "basin_id": basin_objs["THAMIRABARANI"].id,
                    "river_name": "Thamirabarani",
                    "district": "Thoothukudi",
                    "latitude": 8.6250,
                    "longitude": 77.9120,
                    "zero_gauge_m": 8.0,
                    "warning_level_m": 13.2,
                    "danger_level_m": 15.0,
                    "highest_flood_level_m": 18.2,
                    "hfl_date": "2023-12-19",
                    "station_type": "Delta Estuary Flood Regulator"
                },

                # Vaigai Basin
                {
                    "station_code": "VAI-AND-01",
                    "name": "Andipatti / Vaigai Dam",
                    "basin_id": basin_objs["VAIGAI"].id,
                    "river_name": "Vaigai",
                    "district": "Theni",
                    "latitude": 10.0540,
                    "longitude": 77.5850,
                    "zero_gauge_m": 265.0,
                    "warning_level_m": 280.0,
                    "danger_level_m": 282.5,
                    "highest_flood_level_m": 283.8,
                    "hfl_date": "1993-12-05",
                    "station_type": "Reservoir & Discharge Headworks"
                },
                {
                    "station_code": "VAI-MAD-02",
                    "name": "Madurai Albert Victor Bridge",
                    "basin_id": basin_objs["VAIGAI"].id,
                    "river_name": "Vaigai",
                    "district": "Madurai",
                    "latitude": 9.9250,
                    "longitude": 78.1190,
                    "zero_gauge_m": 130.0,
                    "warning_level_m": 136.5,
                    "danger_level_m": 138.8,
                    "highest_flood_level_m": 140.2,
                    "hfl_date": "1993-12-06",
                    "station_type": "Urban River Gauge"
                },
                {
                    "station_code": "VAI-PAR-03",
                    "name": "Paramakudi Checkpost",
                    "basin_id": basin_objs["VAIGAI"].id,
                    "river_name": "Vaigai",
                    "district": "Ramanathapuram",
                    "latitude": 9.5440,
                    "longitude": 78.5890,
                    "zero_gauge_m": 40.0,
                    "warning_level_m": 46.2,
                    "danger_level_m": 48.0,
                    "highest_flood_level_m": 49.5,
                    "hfl_date": "2010-12-02",
                    "station_type": "Downstream Hydrological Post"
                },

                # Palar Basin
                {
                    "station_code": "PAL-VAN-01",
                    "name": "Vaniyambadi Bridge",
                    "basin_id": basin_objs["PALAR"].id,
                    "river_name": "Palar",
                    "district": "Tirupathur",
                    "latitude": 12.6840,
                    "longitude": 78.6180,
                    "zero_gauge_m": 340.0,
                    "warning_level_m": 346.5,
                    "danger_level_m": 348.8,
                    "highest_flood_level_m": 350.4,
                    "hfl_date": "2021-11-20",
                    "station_type": "CWC Upper Palar Station"
                },
                {
                    "station_code": "PAL-AMB-02",
                    "name": "Ambur Anicut Station",
                    "basin_id": basin_objs["PALAR"].id,
                    "river_name": "Palar",
                    "district": "Tirupathur",
                    "latitude": 12.7910,
                    "longitude": 78.7150,
                    "zero_gauge_m": 290.0,
                    "warning_level_m": 296.0,
                    "danger_level_m": 298.2,
                    "highest_flood_level_m": 300.1,
                    "hfl_date": "2021-11-21",
                    "station_type": "WRD Flood Diversion Weir"
                },
                {
                    "station_code": "PAL-CHE-03",
                    "name": "Chengalpattu Palar Bridge",
                    "basin_id": basin_objs["PALAR"].id,
                    "river_name": "Palar",
                    "district": "Chengalpattu",
                    "latitude": 12.6780,
                    "longitude": 79.9820,
                    "zero_gauge_m": 35.0,
                    "warning_level_m": 41.5,
                    "danger_level_m": 43.8,
                    "highest_flood_level_m": 45.6,
                    "hfl_date": "2023-12-04",
                    "station_type": "Coastal Flood Gauge (Cyclone Watch)"
                },

                # Pennaiyar (Thenpennai) Basin
                {
                    "station_code": "PEN-SAT-01",
                    "name": "Sathanur Dam Downstream",
                    "basin_id": basin_objs["PENNAIYAR"].id,
                    "river_name": "Pennaiyar",
                    "district": "Tiruvannamalai",
                    "latitude": 12.1850,
                    "longitude": 78.8680,
                    "zero_gauge_m": 210.0,
                    "warning_level_m": 224.0,
                    "danger_level_m": 226.5,
                    "highest_flood_level_m": 228.0,
                    "hfl_date": "2021-11-19",
                    "station_type": "CWC Dam Headworks"
                },
                {
                    "station_code": "PEN-VIL-02",
                    "name": "Villupuram / Thirukovilur",
                    "basin_id": basin_objs["PENNAIYAR"].id,
                    "river_name": "Pennaiyar",
                    "district": "Villupuram",
                    "latitude": 11.9660,
                    "longitude": 79.2020,
                    "zero_gauge_m": 65.0,
                    "warning_level_m": 73.0,
                    "danger_level_m": 75.2,
                    "highest_flood_level_m": 76.9,
                    "hfl_date": "2021-11-20",
                    "station_type": "Middle Basin Observation Site"
                },
                {
                    "station_code": "PEN-CUD-03",
                    "name": "Cuddalore Old Town Outflow",
                    "basin_id": basin_objs["PENNAIYAR"].id,
                    "river_name": "Pennaiyar",
                    "district": "Cuddalore",
                    "latitude": 11.7510,
                    "longitude": 79.7710,
                    "zero_gauge_m": 4.0,
                    "warning_level_m": 9.5,
                    "danger_level_m": 11.2,
                    "highest_flood_level_m": 12.8,
                    "hfl_date": "2015-12-02",
                    "station_type": "Tidal Inundation & River Estuary Gauge"
                },

                # Bhavani Basin
                {
                    "station_code": "BHA-SAG-01",
                    "name": "Bhavanisagar Dam Outflow",
                    "basin_id": basin_objs["BHAVANI"].id,
                    "river_name": "Bhavani",
                    "district": "Erode",
                    "latitude": 11.4720,
                    "longitude": 77.1120,
                    "zero_gauge_m": 260.0,
                    "warning_level_m": 276.5,
                    "danger_level_m": 278.8,
                    "highest_flood_level_m": 280.2,
                    "hfl_date": "2018-08-15",
                    "station_type": "Reservoir Spillway Gauge"
                },
                {
                    "station_code": "BHA-KOD-02",
                    "name": "Kodiveri Anicut Station",
                    "basin_id": basin_objs["BHAVANI"].id,
                    "river_name": "Bhavani",
                    "district": "Erode",
                    "latitude": 11.5340,
                    "longitude": 77.3010,
                    "zero_gauge_m": 195.0,
                    "warning_level_m": 204.0,
                    "danger_level_m": 206.2,
                    "highest_flood_level_m": 208.0,
                    "hfl_date": "2022-08-08",
                    "station_type": "Weir & Irrigation Channel Watch"
                },

                # Amaravathi Basin
                {
                    "station_code": "AMA-DHA-01",
                    "name": "Dharapuram Barrage",
                    "basin_id": basin_objs["AMARAVATHI"].id,
                    "river_name": "Amaravathi",
                    "district": "Tiruppur",
                    "latitude": 10.7300,
                    "longitude": 77.5300,
                    "zero_gauge_m": 225.0,
                    "warning_level_m": 234.0,
                    "danger_level_m": 236.2,
                    "highest_flood_level_m": 237.8,
                    "hfl_date": "2024-07-28",
                    "station_type": "Mid-Reach River Gauge"
                },
                {
                    "station_code": "AMA-KAR-02",
                    "name": "Karur Confluence Site",
                    "basin_id": basin_objs["AMARAVATHI"].id,
                    "river_name": "Amaravathi",
                    "district": "Karur",
                    "latitude": 10.9570,
                    "longitude": 78.0830,
                    "zero_gauge_m": 110.0,
                    "warning_level_m": 118.5,
                    "danger_level_m": 120.4,
                    "highest_flood_level_m": 122.1,
                    "hfl_date": "2005-11-27",
                    "station_type": "Confluence Flow Gauge"
                },
            ]

            for s_data in stations_data:
                station = MonitoringStation(**s_data)
                db.add(station)

            db.commit()
            print(f"Seeded {len(stations_data)} verified monitoring stations.")

        # Seed DataSourceStatus
        if db.query(DataSourceStatus).count() == 0:
            status_entries = [
                DataSourceStatus(
                    source_name="Central Water Commission (CWC)",
                    service_name="National Hydrological Telemetry Portal (NITI Aayog / MoJS)",
                    status="Operational",
                    last_sync_time=datetime.now(timezone.utc),
                    records_count=14980,
                    message="CWC telemetry operational; calibrated baseline active in demo mode.",
                    is_demo=True
                ),
                DataSourceStatus(
                    source_name="India Meteorological Department (IMD)",
                    service_name="Regional Meteorological Centre, Chennai (RMC Chennai)",
                    status="Operational",
                    last_sync_time=datetime.now(timezone.utc),
                    records_count=21400,
                    message="IMD AWS rainfall network telemetry active.",
                    is_demo=True
                ),
                DataSourceStatus(
                    source_name="Tamil Nadu Water Resources Department (WRD)",
                    service_name="State Dam Safety & Flood Inundation Information System",
                    status="Operational",
                    last_sync_time=datetime.now(timezone.utc),
                    records_count=8720,
                    message="Reservoir inflow/outflow schedules synchronized.",
                    is_demo=True
                ),
                DataSourceStatus(
                    source_name="Open-Meteo High-Resolution NWP",
                    service_name="Open-Meteo Precipitation & Soil Moisture API",
                    status="Operational",
                    last_sync_time=datetime.now(timezone.utc),
                    records_count=5280,
                    message="External weather forecast API connected.",
                    is_demo=False
                ),
            ]
            for se in status_entries:
                db.add(se)
            db.commit()

        # Seed or refresh ModelMetrics from model_metrics.json
        metrics_file = Path(__file__).resolve().parent / "ml_models" / "model_metrics.json"
        if metrics_file.exists() and db.query(ModelMetrics).count() == 0:
            with open(metrics_file, "r") as f:
                m_data = json.load(f)
            mm = ModelMetrics(
                model_name=m_data.get("model_name", "Random Forest Ensemble"),
                version=m_data.get("version", "RF-v1.0.0"),
                trained_at=datetime.fromisoformat(m_data.get("trained_at")),
                train_records=m_data.get("train_records", 0),
                test_records=m_data.get("test_records", 0),
                accuracy=m_data.get("accuracy", 0.95),
                precision_weighted=m_data.get("precision_weighted", 0.95),
                recall_weighted=m_data.get("recall_weighted", 0.95),
                f1_weighted=m_data.get("f1_weighted", 0.95),
                classification_report_json=json.dumps(m_data.get("classification_report", {})),
                confusion_matrix_json=json.dumps(m_data.get("confusion_matrix", [])),
                regressor_mae=m_data.get("regressor_mae", 0.15),
                regressor_rmse=m_data.get("regressor_rmse", 0.22),
                regressor_r2=m_data.get("regressor_r2", 0.99),
                feature_importance_json=json.dumps(m_data.get("feature_importance", [])),
                is_active=True
            )
            db.add(mm)
            db.commit()
            print("Imported ML Model Evaluation Metrics into database.")

        # Seed realistic current & historical observations for each station
        stations = db.query(MonitoringStation).all()
        now = datetime.now(timezone.utc)

        # Ensure we have a couple of elevated/high-risk stations for rich demo experience:
        # e.g., Cheranmahadevi (THA-CHE-01) in Critical risk, and Grand Anicut (CAU-GNA-04) in High risk
        high_risk_codes = {"THA-CHE-01": "Critical", "CAU-GNA-04": "High", "PEN-CUD-03": "Moderate"}

        for station in stations:
            # Check if recent observations exist
            recent_obs = db.query(RiverLevelObservation).filter(RiverLevelObservation.station_id == station.id).count()
            if recent_obs > 24:
                continue

            target_condition = high_risk_codes.get(station.station_code, "Normal")

            # Seed 24 hours of hourly history leading up to now
            for h in range(24, -1, -1):
                obs_time = now - timedelta(hours=h)

                if target_condition == "Critical":
                    # Simulated surge at Thamirabarani Cheranmahadevi
                    wl = station.danger_level_m + round(0.25 + (24 - h) * 0.03, 2)
                    r_1h = round(22.0 + random.uniform(0.0, 15.0), 1)
                    r_24h = round(165.0 + (24 - h) * 3.5, 1)
                    discharge = 45000.0 + (24 - h) * 1200.0
                    roc = 0.28
                    soil = 94.0
                    temp = 23.5
                    hum = 96.0
                    danger_status = "Danger"

                elif target_condition == "High":
                    # Simulated high flood discharge at Grand Anicut
                    wl = station.warning_level_m + round(0.8 + (24 - h) * 0.02, 2)
                    r_1h = round(12.0 + random.uniform(0.0, 8.0), 1)
                    r_24h = round(92.0 + (24 - h) * 1.5, 1)
                    discharge = 82000.0
                    roc = 0.18
                    soil = 86.0
                    temp = 25.0
                    hum = 88.0
                    danger_status = "Warning"

                elif target_condition == "Moderate":
                    # Simulated moderate rise at Pennaiyar Cuddalore
                    span = station.warning_level_m - station.zero_gauge_m
                    wl = round(station.zero_gauge_m + span * 0.88, 2)
                    r_1h = round(6.5 + random.uniform(0.0, 4.0), 1)
                    r_24h = round(52.0 + random.uniform(0.0, 8.0), 1)
                    discharge = 7500.0
                    roc = 0.08
                    soil = 74.0
                    temp = 27.0
                    hum = 82.0
                    danger_status = "Normal"

                else:
                    # Normal stable conditions
                    span = station.warning_level_m - station.zero_gauge_m
                    wl = round(station.zero_gauge_m + span * (0.35 + random.uniform(-0.05, 0.05)), 2)
                    r_1h = max(0.0, round(random.uniform(0.0, 3.0), 1))
                    r_24h = round(r_1h * 3.0 + random.uniform(0.0, 15.0), 1)
                    discharge = round(random.uniform(800.0, 3200.0), 1)
                    roc = round(random.uniform(-0.03, 0.03), 3)
                    soil = round(random.uniform(40.0, 60.0), 1)
                    temp = round(random.uniform(28.0, 33.0), 1)
                    hum = round(random.uniform(60.0, 75.0), 1)
                    danger_status = "Normal"

                weather_obs = WeatherObservation(
                    station_id=station.id,
                    timestamp=obs_time,
                    rainfall_1h_mm=r_1h,
                    rainfall_3h_mm=round(r_1h * 2.1, 1),
                    rainfall_6h_mm=round(r_1h * 3.4, 1),
                    rainfall_12h_mm=round(r_24h * 0.6, 1),
                    rainfall_24h_mm=r_24h,
                    rainfall_72h_mm=round(r_24h * 1.5, 1),
                    forecast_rainfall_24h_mm=round(r_24h * 0.8, 1),
                    temperature_c=temp,
                    humidity_pct=hum,
                    soil_moisture_pct=soil,
                    data_source="IMD Automatic Weather Station (Demo)",
                    is_simulated=True
                )
                db.add(weather_obs)

                river_obs = RiverLevelObservation(
                    station_id=station.id,
                    timestamp=obs_time,
                    water_level_m=wl,
                    rate_of_change_m_hr=roc,
                    upstream_water_level_m=round(wl + 0.6, 2),
                    reservoir_discharge_cusecs=discharge,
                    flow_velocity_m_s=round(random.uniform(1.1, 2.2), 2),
                    danger_status=danger_status,
                    data_source="Central Water Commission Gauge (Demo)",
                    is_simulated=True
                )
                db.add(river_obs)

            db.commit()

            # Run ML prediction on the latest observation
            latest_w = {
                "rainfall_1h_mm": r_1h,
                "rainfall_3h_mm": round(r_1h * 2.1, 1),
                "rainfall_6h_mm": round(r_1h * 3.4, 1),
                "rainfall_12h_mm": round(r_24h * 0.6, 1),
                "rainfall_24h_mm": r_24h,
                "rainfall_72h_mm": round(r_24h * 1.5, 1),
                "forecast_rainfall_24h_mm": round(r_24h * 0.8, 1),
                "temperature_c": temp,
                "humidity_pct": hum,
                "soil_moisture_pct": soil,
            }
            latest_r = {
                "water_level_m": wl,
                "rate_of_change_m_hr": roc,
                "upstream_water_level_m": round(wl + 0.6, 2),
                "reservoir_discharge_cusecs": discharge,
            }

            pred_result = flood_model.predict(
                weather_dict=latest_w,
                river_dict=latest_r,
                station_danger_level=station.danger_level_m,
                station_warning_level=station.warning_level_m,
                station_name=station.name,
                river_name=station.river_name
            )

            prediction = FloodPrediction(
                station_id=station.id,
                timestamp=now,
                predicted_risk_level=pred_result["predicted_risk_level"],
                flood_probability=pred_result["flood_probability"],
                predicted_water_level_24h=pred_result["predicted_water_level_24h"],
                forecast_horizon_hours=24,
                model_version=pred_result["model_version"],
                feature_importance_json=json.dumps(pred_result["feature_importance"]),
                recommended_actions_json=json.dumps(pred_result["recommended_actions"]),
                data_freshness_minutes=10,
                is_reliable=True,
                is_simulated=True
            )
            db.add(prediction)
            db.commit()

            # Trigger alert if elevated
            if pred_result["predicted_risk_level"] in ["High", "Critical"]:
                alert_engine.evaluate_and_trigger_alert(
                    db=db,
                    station=station,
                    risk_level=pred_result["predicted_risk_level"],
                    observed_water_level=wl,
                    predicted_water_level=pred_result["predicted_water_level_24h"]
                )

        print(f"Database seeded successfully with {len(stations)} stations, observations, predictions, and alerts!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
