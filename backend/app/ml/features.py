import numpy as np
from typing import Dict, Any, List

FEATURE_COLUMNS = [
    "rainfall_1h_mm",
    "rainfall_3h_mm",
    "rainfall_6h_mm",
    "rainfall_12h_mm",
    "rainfall_24h_mm",
    "rainfall_72h_mm",
    "current_water_level_m",
    "water_level_to_danger_ratio",
    "water_level_to_warning_ratio",
    "rate_of_change_m_hr",
    "upstream_water_level_m",
    "reservoir_discharge_cusecs",
    "soil_moisture_pct",
    "forecast_rainfall_24h_mm",
    "temperature_c",
    "humidity_pct",
]

FEATURE_LABELS = {
    "rainfall_1h_mm": "1-Hour Rainfall (mm)",
    "rainfall_3h_mm": "3-Hour Rainfall (mm)",
    "rainfall_6h_mm": "6-Hour Rainfall (mm)",
    "rainfall_12h_mm": "12-Hour Rainfall (mm)",
    "rainfall_24h_mm": "24-Hour Rainfall (mm)",
    "rainfall_72h_mm": "72-Hour Cumulative Rainfall (mm)",
    "current_water_level_m": "Current River Level (m)",
    "water_level_to_danger_ratio": "Level to Danger Level Ratio",
    "water_level_to_warning_ratio": "Level to Warning Level Ratio",
    "rate_of_change_m_hr": "River Gauge Rise Rate (m/hr)",
    "upstream_water_level_m": "Upstream Gauge Level (m)",
    "reservoir_discharge_cusecs": "Reservoir Inflow/Discharge (cusecs)",
    "soil_moisture_pct": "Catchment Soil Moisture (%)",
    "forecast_rainfall_24h_mm": "IMD 24h Rainfall Forecast (mm)",
    "temperature_c": "Ambient Temperature (°C)",
    "humidity_pct": "Atmospheric Humidity (%)",
}

RISK_CLASSES = ["Low", "Moderate", "High", "Critical"]

def extract_features_vector(
    weather: Dict[str, Any],
    river: Dict[str, Any],
    station_danger_level: float,
    station_warning_level: float
) -> np.ndarray:
    """Extract and validate normalized feature vector for ML inference."""
    wl = float(river.get("water_level_m", 0.0))
    danger_ratio = round(wl / max(station_danger_level, 0.1), 3)
    warning_ratio = round(wl / max(station_warning_level, 0.1), 3)

    vector = [
        float(weather.get("rainfall_1h_mm", 0.0)),
        float(weather.get("rainfall_3h_mm", 0.0)),
        float(weather.get("rainfall_6h_mm", 0.0)),
        float(weather.get("rainfall_12h_mm", 0.0)),
        float(weather.get("rainfall_24h_mm", 0.0)),
        float(weather.get("rainfall_72h_mm", 0.0)),
        wl,
        danger_ratio,
        warning_ratio,
        float(river.get("rate_of_change_m_hr", 0.0)),
        float(river.get("upstream_water_level_m", wl * 0.95)),
        float(river.get("reservoir_discharge_cusecs", 0.0)),
        float(weather.get("soil_moisture_pct", 45.0)),
        float(weather.get("forecast_rainfall_24h_mm", 0.0)),
        float(weather.get("temperature_c", 28.0)),
        float(weather.get("humidity_pct", 75.0)),
    ]
    return np.array([vector], dtype=np.float32)

def generate_safety_recommendations(risk_level: str, station_name: str, river_name: str) -> List[str]:
    """Generates standard SOP recommended actions based on risk level and guidelines."""
    if risk_level == "Critical":
        return [
            f"URGENT: Initiate immediate evacuation protocols for low-lying settlements along {river_name} near {station_name}.",
            "Activate District Emergency Operation Center (DEOC) - Helpline 1077 / State Emergency 1070.",
            "Deploy SDRF / NDRF rescue teams and boat units to identified flood inundation zones.",
            "Cut electricity to inundated sub-stations to prevent electrocution hazards.",
            "Sound flood alert sirens across downstream habitations and bridge check-posts."
        ]
    elif risk_level == "High":
        return [
            f"PRECAUTIONARY ALERT: Prohibit public access to riverbanks and check dams across {river_name}.",
            f"Inspect flood bunds, regulator shutters, and earthen embankments around {station_name}.",
            "Prepare temporary relief camps with drinking water, dry rations, and medical first-aid.",
            "Alert downstream irrigation engineers and revenue officers regarding anticipated water level surge.",
            "Broadcast hourly audio advisories via local panchayats and loudspeakers."
        ]
    elif risk_level == "Moderate":
        return [
            f"HEIGHTENED WATCH: Increase river gauge reading frequency from 3-hourly to hourly at {station_name}.",
            "Clear debris and water hyacinth obstructing culverts, sluice gates, and bridge piers.",
            "Monitor upstream reservoir discharge releases and catchment rainfall trends.",
            "Ensure emergency diesel generators and dewatering high-discharge pumps are operational."
        ]
    else:
        return [
            f"NORMAL MONITORING: Continuous automated telemetry logging active at {station_name}.",
            "Standard routine hydrological and meteorological observations ongoing.",
            "All water levels currently within safe carrying capacity."
        ]
