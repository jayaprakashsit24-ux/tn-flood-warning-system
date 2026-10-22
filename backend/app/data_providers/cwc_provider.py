import random
from typing import Dict, Any
from datetime import datetime, timezone
from app.data_providers.base import BaseDataProvider

class CWCHydrologicalProvider(BaseDataProvider):
    """Central Water Commission & Tamil Nadu Water Resources Department hydrological service."""

    def __init__(self):
        self.name = "Central Water Commission (CWC) & TN WRD Telemetry"
        self.last_sync = datetime.now(timezone.utc)
        self.status_msg = "Hydrological sensor telemetry operational"

    def get_provider_name(self) -> str:
        return self.name

    async def fetch_weather_observation(self, lat: float, lon: float, station_code: str) -> Dict[str, Any]:
        return {}

    async def fetch_river_observation(
        self,
        station_code: str,
        danger_level: float,
        warning_level: float,
        zero_gauge: float
    ) -> Dict[str, Any]:
        """Fetch river gauge level, rate of rise, and reservoir discharge."""
        self.last_sync = datetime.now(timezone.utc)
        
        # Determine gauge state (Normal, Warning, or Danger)
        # 15% chance of elevated danger/warning for realistic active monitoring in demo mode
        scenario = random.random()
        if scenario < 0.10:
            # Above danger level
            wl = danger_level + round(random.uniform(0.1, 0.8), 2)
            danger_status = "Danger"
            rate_of_change = round(random.uniform(0.15, 0.45), 2)
            discharge = round(random.uniform(15000.0, 75000.0), 1)
        elif scenario < 0.25:
            # Between warning and danger level
            wl = warning_level + round(random.uniform(0.1, (danger_level - warning_level) * 0.9), 2)
            danger_status = "Warning"
            rate_of_change = round(random.uniform(0.05, 0.25), 2)
            discharge = round(random.uniform(5000.0, 20000.0), 1)
        else:
            # Normal safe water level
            span = warning_level - zero_gauge
            wl = round(zero_gauge + span * random.uniform(0.25, 0.75), 2)
            danger_status = "Normal"
            rate_of_change = round(random.uniform(-0.10, 0.08), 2)
            discharge = round(random.uniform(800.0, 4500.0), 1)

        upstream_wl = round(wl + random.uniform(0.2, 1.5), 2)
        velocity = round(random.uniform(0.8, 2.5), 2)

        return {
            "water_level_m": wl,
            "rate_of_change_m_hr": rate_of_change,
            "upstream_water_level_m": upstream_wl,
            "reservoir_discharge_cusecs": discharge,
            "flow_velocity_m_s": velocity,
            "danger_status": danger_status,
            "data_source": "CWC / State WRD Gauge Station",
            "is_simulated": True
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "source_name": "Central Water Commission Telemetry",
            "service_name": self.name,
            "status": "Operational",
            "last_sync_time": self.last_sync,
            "message": self.status_msg,
            "is_demo": True
        }
