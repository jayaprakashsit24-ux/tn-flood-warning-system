from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime

class BaseDataProvider(ABC):
    @abstractmethod
    def get_provider_name(self) -> str:
        """Name of the data provider source."""
        pass

    @abstractmethod
    async def fetch_weather_observation(self, lat: float, lon: float, station_code: str) -> Dict[str, Any]:
        """Fetch rainfall, temp, humidity, and weather conditions."""
        pass

    @abstractmethod
    async def fetch_river_observation(self, station_code: str, danger_level: float, warning_level: float, zero_gauge: float) -> Dict[str, Any]:
        """Fetch river gauge level, discharge, and rate of change."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Returns health status of the provider."""
        pass
