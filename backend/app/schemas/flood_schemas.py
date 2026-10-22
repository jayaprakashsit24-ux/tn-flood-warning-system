from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Basin Schemas ---
class RiverBasinBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    drainage_area_sq_km: float
    primary_districts: str
    origin: str
    outflow: str
    is_interstate: bool = False
    color_hex: str = "#3b82f6"

class RiverBasinOut(RiverBasinBase):
    id: int
    station_count: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)


# --- Station Schemas ---
class MonitoringStationBase(BaseModel):
    station_code: str
    name: str
    basin_id: int
    river_name: str
    district: str
    latitude: float
    longitude: float
    zero_gauge_m: float
    warning_level_m: float
    danger_level_m: float
    highest_flood_level_m: float
    hfl_date: Optional[str] = None
    station_type: str = "Hydrological & Meteorological"
    is_active: bool = True

class MonitoringStationOut(MonitoringStationBase):
    id: int
    basin_name: Optional[str] = None
    current_water_level: Optional[float] = None
    current_rainfall_24h: Optional[float] = None
    danger_ratio: Optional[float] = None
    current_risk_level: Optional[str] = "Low"  # Low, Moderate, High, Critical
    last_updated: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class MonitoringStationDetail(MonitoringStationOut):
    latest_weather: Optional[Dict[str, Any]] = None
    latest_river_level: Optional[Dict[str, Any]] = None
    latest_prediction: Optional[Dict[str, Any]] = None
    active_alerts: Optional[List[Dict[str, Any]]] = []


# --- Observation Schemas ---
class WeatherObservationCreate(BaseModel):
    station_id: int
    rainfall_1h_mm: float = 0.0
    rainfall_3h_mm: float = 0.0
    rainfall_6h_mm: float = 0.0
    rainfall_12h_mm: float = 0.0
    rainfall_24h_mm: float = 0.0
    rainfall_72h_mm: float = 0.0
    forecast_rainfall_24h_mm: float = 0.0
    temperature_c: float = 28.0
    humidity_pct: float = 75.0
    soil_moisture_pct: float = 45.0
    data_source: str = "Manual Entry"

class WeatherObservationOut(WeatherObservationCreate):
    id: int
    timestamp: datetime
    is_simulated: bool
    model_config = ConfigDict(from_attributes=True)


class RiverLevelObservationCreate(BaseModel):
    station_id: int
    water_level_m: float
    rate_of_change_m_hr: float = 0.0
    upstream_water_level_m: float = 0.0
    reservoir_discharge_cusecs: float = 0.0
    flow_velocity_m_s: float = 1.2
    data_source: str = "Manual Entry"

class RiverLevelObservationOut(RiverLevelObservationCreate):
    id: int
    timestamp: datetime
    danger_status: str
    is_simulated: bool
    model_config = ConfigDict(from_attributes=True)


# --- Prediction Schemas ---
class PredictionRequest(BaseModel):
    station_id: int
    rainfall_1h_mm: Optional[float] = Field(None, ge=0.0, le=500.0)
    rainfall_3h_mm: Optional[float] = Field(None, ge=0.0, le=800.0)
    rainfall_6h_mm: Optional[float] = Field(None, ge=0.0, le=1000.0)
    rainfall_12h_mm: Optional[float] = Field(None, ge=0.0, le=1200.0)
    rainfall_24h_mm: Optional[float] = Field(None, ge=0.0, le=1500.0)
    rainfall_72h_mm: Optional[float] = Field(None, ge=0.0, le=2500.0)
    current_water_level: Optional[float] = Field(None, ge=0.0, le=1500.0)
    rate_of_change_m_hr: Optional[float] = Field(None, ge=-10.0, le=10.0)
    upstream_water_level: Optional[float] = Field(None, ge=0.0, le=1500.0)
    reservoir_discharge_cusecs: Optional[float] = Field(None, ge=0.0, le=1000000.0)
    soil_moisture_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    forecast_rainfall_24h_mm: Optional[float] = Field(None, ge=0.0, le=1000.0)
    temperature_c: Optional[float] = Field(None, ge=-10.0, le=55.0)
    humidity_pct: Optional[float] = Field(None, ge=0.0, le=100.0)


class FeatureImportanceItem(BaseModel):
    feature: str
    label: str
    importance: float
    value: float


class PredictionResponse(BaseModel):
    station_id: int
    station_name: str
    basin_name: str
    district: str
    timestamp: datetime
    predicted_risk_level: str  # Low, Moderate, High, Critical
    flood_probability: float  # 0.0 to 1.0 (calibrated)
    predicted_water_level_24h: float
    warning_level_m: float
    danger_level_m: float
    hfl_m: float
    forecast_horizon_hours: int = 24
    model_version: str
    feature_importance: List[FeatureImportanceItem]
    recommended_actions: List[str]
    data_freshness_minutes: int
    is_reliable: bool
    is_simulated: bool
    created_alert: Optional[Dict[str, Any]] = None


class PredictionHistoryOut(BaseModel):
    id: int
    station_id: int
    station_name: str
    district: str
    timestamp: datetime
    predicted_risk_level: str
    flood_probability: float
    predicted_water_level_24h: float
    forecast_horizon_hours: int
    model_version: str
    model_config = ConfigDict(from_attributes=True)


# --- Alert Schemas ---
class AlertOut(BaseModel):
    id: int
    alert_code: str
    station_id: int
    station_name: Optional[str] = None
    basin_name: str
    district: str
    risk_level: str
    reason: str
    observed_water_level: float
    predicted_water_level: float
    threshold_exceeded: str
    recommended_actions: List[str]
    status: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_by: Optional[str] = None
    is_simulated: bool
    model_config = ConfigDict(from_attributes=True)


class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: str = "Disaster Management Officer"


class AlertResolveRequest(BaseModel):
    resolved_by: str = "Disaster Management Officer"
    resolution_notes: Optional[str] = "Water levels receded below warning threshold."


# --- Dashboard Summary Schemas ---
class DashboardSummaryOut(BaseModel):
    total_monitoring_stations: int
    high_risk_stations_count: int
    critical_risk_stations_count: int
    active_alerts_count: int
    mean_rainfall_24h_mm: float
    max_recorded_level_m: float
    max_level_station_name: str
    last_data_update: datetime
    data_source_mode: str  # "DEMO MODE (Simulated)" or "LIVE TELEMETRY"
    system_status: str
    risk_distribution: Dict[str, int]
    recent_alerts: List[AlertOut]
    recent_predictions: List[PredictionHistoryOut]


# --- Model Metrics Schemas ---
class ModelMetricsOut(BaseModel):
    model_name: str
    version: str
    trained_at: datetime
    train_records: int
    test_records: int
    accuracy: float
    precision_weighted: float
    recall_weighted: float
    f1_weighted: float
    classification_report: Dict[str, Any]
    confusion_matrix: List[List[int]]
    classes: List[str]
    regressor_mae: float
    regressor_rmse: float
    regressor_r2: float
    feature_importance: List[Dict[str, Any]]
    is_active: bool


# --- Data Source Status Schemas ---
class DataSourceStatusOut(BaseModel):
    id: int
    source_name: str
    service_name: str
    status: str
    last_sync_time: datetime
    records_count: int
    message: str
    is_demo: bool
    model_config = ConfigDict(from_attributes=True)

