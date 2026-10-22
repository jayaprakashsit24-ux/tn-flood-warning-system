export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface RiverBasin {
  id: number;
  code: string;
  name: string;
  description: string;
  drainage_area_sq_km: number;
  primary_districts: string;
  origin: string;
  outflow: string;
  is_interstate: boolean;
  color_hex: string;
  station_count: number;
}

export interface MonitoringStation {
  id: number;
  station_code: string;
  name: string;
  basin_id: number;
  basin_name: string;
  river_name: string;
  district: string;
  latitude: number;
  longitude: number;
  zero_gauge_m: number;
  warning_level_m: number;
  danger_level_m: number;
  highest_flood_level_m: number;
  hfl_date?: string;
  station_type: string;
  is_active: boolean;
  current_water_level: number;
  current_rainfall_24h: number;
  danger_ratio: number;
  current_risk_level: RiskLevel;
  last_updated: string;
}

export interface MonitoringStationDetail extends MonitoringStation {
  latest_weather?: {
    rainfall_1h_mm: number;
    rainfall_3h_mm: number;
    rainfall_6h_mm: number;
    rainfall_12h_mm: number;
    rainfall_24h_mm: number;
    rainfall_72h_mm: number;
    forecast_rainfall_24h_mm: number;
    temperature_c: number;
    humidity_pct: number;
    soil_moisture_pct: number;
    data_source: string;
    timestamp: string;
  };
  latest_river_level?: {
    water_level_m: number;
    rate_of_change_m_hr: number;
    upstream_water_level_m: number;
    reservoir_discharge_cusecs: number;
    flow_velocity_m_s: number;
    danger_status: string;
    data_source: string;
    timestamp: string;
  };
  latest_prediction?: {
    predicted_risk_level: RiskLevel;
    flood_probability: number;
    predicted_water_level_24h: number;
    forecast_horizon_hours: number;
    model_version: string;
    feature_importance: FeatureImportance[];
    recommended_actions: string[];
    timestamp: string;
  };
  active_alerts: {
    id: number;
    alert_code: string;
    risk_level: RiskLevel;
    reason: string;
    status: string;
    created_at: string;
  }[];
}

export interface FeatureImportance {
  feature: string;
  label: string;
  importance: number;
  value: number;
}

export interface AlertItem {
  id: number;
  alert_code: string;
  station_id: number;
  station_name: string;
  basin_name: string;
  district: string;
  risk_level: RiskLevel;
  reason: string;
  observed_water_level: number;
  predicted_water_level: number;
  threshold_exceeded: string;
  recommended_actions: string[];
  status: 'Active' | 'Acknowledged' | 'Resolved';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: string;
  resolved_by?: string;
  is_simulated: boolean;
}

export interface PredictionHistory {
  id: number;
  station_id: number;
  station_name: string;
  district: string;
  timestamp: string;
  predicted_risk_level: RiskLevel;
  flood_probability: number;
  predicted_water_level_24h: number;
  forecast_horizon_hours: number;
  model_version: string;
}

export interface DashboardSummary {
  total_monitoring_stations: number;
  high_risk_stations_count: number;
  critical_risk_stations_count: number;
  active_alerts_count: number;
  mean_rainfall_24h_mm: number;
  max_recorded_level_m: number;
  max_level_station_name: string;
  last_data_update: string;
  data_source_mode: string;
  system_status: string;
  risk_distribution: {
    Low: number;
    Moderate: number;
    High: number;
    Critical: number;
  };
  recent_alerts: AlertItem[];
  recent_predictions: PredictionHistory[];
}

export interface ModelMetrics {
  model_name: string;
  version: string;
  trained_at: string;
  train_records: number;
  test_records: number;
  accuracy: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
  classification_report: Record<string, any>;
  confusion_matrix: number[][];
  classes: string[];
  regressor_mae: number;
  regressor_rmse: number;
  regressor_r2: number;
  feature_importance: FeatureImportance[];
  is_active: boolean;
}

export interface DataSourceStatus {
  id: number;
  source_name: string;
  service_name: string;
  status: string;
  last_sync_time: string;
  records_count: number;
  message: string;
  is_demo: boolean;
}

export interface HistoricalPoint {
  timestamp: string;
  water_level_m: number;
  warning_level_m: number;
  danger_level_m: number;
  hfl_m: number;
  rainfall_1h_mm: number;
  rainfall_24h_mm: number;
  reservoir_discharge_cusecs: number;
  danger_status: string;
}

export interface PredictionRequestPayload {
  station_id: number;
  rainfall_1h_mm?: number;
  rainfall_3h_mm?: number;
  rainfall_6h_mm?: number;
  rainfall_12h_mm?: number;
  rainfall_24h_mm?: number;
  rainfall_72h_mm?: number;
  current_water_level?: number;
  rate_of_change_m_hr?: number;
  upstream_water_level?: number;
  reservoir_discharge_cusecs?: number;
  soil_moisture_pct?: number;
  forecast_rainfall_24h_mm?: number;
  temperature_c?: number;
  humidity_pct?: number;
}
