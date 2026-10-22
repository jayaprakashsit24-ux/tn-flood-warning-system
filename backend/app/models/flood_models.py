from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

class RiverBasin(Base):
    __tablename__ = "river_basins"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    drainage_area_sq_km = Column(Float, nullable=False)
    primary_districts = Column(String(255), nullable=False)  # Comma separated
    origin = Column(String(150), nullable=False)
    outflow = Column(String(100), nullable=False)
    is_interstate = Column(Boolean, default=False)
    color_hex = Column(String(10), default="#3b82f6")
    
    stations = relationship("MonitoringStation", back_populates="basin", cascade="all, delete-orphan")


class MonitoringStation(Base):
    __tablename__ = "monitoring_stations"

    id = Column(Integer, primary_key=True, index=True)
    station_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    basin_id = Column(Integer, ForeignKey("river_basins.id"), nullable=False)
    river_name = Column(String(100), nullable=False)
    district = Column(String(100), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    zero_gauge_m = Column(Float, nullable=False, default=0.0)  # Mean Sea Level zero gauge
    warning_level_m = Column(Float, nullable=False)
    danger_level_m = Column(Float, nullable=False)
    highest_flood_level_m = Column(Float, nullable=False)
    hfl_date = Column(String(50), nullable=True)
    
    station_type = Column(String(50), default="Hydrological & Meteorological")  # CWC, State WRD
    is_active = Column(Boolean, default=True)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    basin = relationship("RiverBasin", back_populates="stations")
    weather_observations = relationship("WeatherObservation", back_populates="station", cascade="all, delete-orphan")
    river_observations = relationship("RiverLevelObservation", back_populates="station", cascade="all, delete-orphan")
    predictions = relationship("FloodPrediction", back_populates="station", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="station", cascade="all, delete-orphan")


class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("monitoring_stations.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    rainfall_1h_mm = Column(Float, default=0.0)
    rainfall_3h_mm = Column(Float, default=0.0)
    rainfall_6h_mm = Column(Float, default=0.0)
    rainfall_12h_mm = Column(Float, default=0.0)
    rainfall_24h_mm = Column(Float, default=0.0)
    rainfall_72h_mm = Column(Float, default=0.0)
    forecast_rainfall_24h_mm = Column(Float, default=0.0)
    
    temperature_c = Column(Float, default=28.0)
    humidity_pct = Column(Float, default=75.0)
    soil_moisture_pct = Column(Float, default=45.0)
    
    data_source = Column(String(100), default="IMD Automatic Weather Station")
    is_simulated = Column(Boolean, default=True)
    
    station = relationship("MonitoringStation", back_populates="weather_observations")


class RiverLevelObservation(Base):
    __tablename__ = "river_level_observations"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("monitoring_stations.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    water_level_m = Column(Float, nullable=False)
    rate_of_change_m_hr = Column(Float, default=0.0)  # + rising, - falling
    upstream_water_level_m = Column(Float, default=0.0)
    reservoir_discharge_cusecs = Column(Float, default=0.0)
    flow_velocity_m_s = Column(Float, default=1.2)
    danger_status = Column(String(20), default="Normal")  # Normal, Warning, Danger
    
    data_source = Column(String(100), default="Central Water Commission")
    is_simulated = Column(Boolean, default=True)
    
    station = relationship("MonitoringStation", back_populates="river_observations")


class FloodPrediction(Base):
    __tablename__ = "flood_predictions"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("monitoring_stations.id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    predicted_risk_level = Column(String(20), nullable=False)  # Low, Moderate, High, Critical
    flood_probability = Column(Float, nullable=False)  # 0.0 to 1.0
    predicted_water_level_24h = Column(Float, nullable=False)
    forecast_horizon_hours = Column(Integer, default=24)
    model_version = Column(String(50), default="RF-v1.0.0")
    
    feature_importance_json = Column(Text, nullable=True)
    recommended_actions_json = Column(Text, nullable=True)
    data_freshness_minutes = Column(Integer, default=15)
    is_reliable = Column(Boolean, default=True)
    is_simulated = Column(Boolean, default=True)
    
    station = relationship("MonitoringStation", back_populates="predictions")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_code = Column(String(60), unique=True, index=True, nullable=False)
    station_id = Column(Integer, ForeignKey("monitoring_stations.id"), index=True, nullable=False)
    basin_name = Column(String(100), nullable=False)
    district = Column(String(100), index=True, nullable=False)
    risk_level = Column(String(20), index=True, nullable=False)  # Low, Moderate, High, Critical
    reason = Column(Text, nullable=False)
    
    observed_water_level = Column(Float, nullable=False)
    predicted_water_level = Column(Float, nullable=False)
    threshold_exceeded = Column(String(100), nullable=False)
    recommended_actions_json = Column(Text, nullable=False)
    
    status = Column(String(20), default="Active", index=True)  # Active, Acknowledged, Resolved
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    is_simulated = Column(Boolean, default=True)
    
    station = relationship("MonitoringStation", back_populates="alerts")


class ModelMetrics(Base):
    __tablename__ = "model_metrics"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    trained_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    train_records = Column(Integer, default=0)
    test_records = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    precision_weighted = Column(Float, default=0.0)
    recall_weighted = Column(Float, default=0.0)
    f1_weighted = Column(Float, default=0.0)
    
    classification_report_json = Column(Text, nullable=True)
    confusion_matrix_json = Column(Text, nullable=True)
    regressor_mae = Column(Float, default=0.0)
    regressor_rmse = Column(Float, default=0.0)
    regressor_r2 = Column(Float, default=0.0)
    feature_importance_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)


class DataSourceStatus(Base):
    __tablename__ = "data_source_status"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(100), unique=True, nullable=False)
    service_name = Column(String(150), nullable=False)
    status = Column(String(30), default="Operational")  # Operational, Degraded, Down, Demo Mode
    last_sync_time = Column(DateTime, default=datetime.utcnow)
    records_count = Column(Integer, default=0)
    message = Column(String(255), default="Service responding normally")
    is_demo = Column(Boolean, default=True)

# Composite indexes for fast query filtering
Index("idx_station_obs_time", RiverLevelObservation.station_id, RiverLevelObservation.timestamp.desc())
Index("idx_weather_obs_time", WeatherObservation.station_id, WeatherObservation.timestamp.desc())
Index("idx_alert_status_risk", Alert.status, Alert.risk_level)
