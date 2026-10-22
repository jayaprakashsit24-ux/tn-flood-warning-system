import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    APP_NAME: str = "Tamil Nadu Flood Prediction & Early Warning System"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/flood_warning.db")
    
    # Mode & Integrations
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    WEATHER_API_PROVIDER: str = os.getenv("WEATHER_API_PROVIDER", "open-meteo")  # open-meteo doesn't need key
    
    # Early Warning Risk Thresholds (% of Danger Level)
    THRESHOLD_MODERATE_RATIO: float = 0.85
    THRESHOLD_HIGH_RATIO: float = 0.95
    THRESHOLD_CRITICAL_RATIO: float = 1.00
    
    # Rainfall Thresholds (mm in 24 hours - IMD classification)
    HEAVY_RAINFALL_24H_MM: float = 64.5
    VERY_HEAVY_RAINFALL_24H_MM: float = 115.6
    EXTREMELY_HEAVY_RAINFALL_24H_MM: float = 204.4
    
    # Alert Suppression
    ALERT_DUPLICATE_WINDOW_HOURS: int = 4
    
    # Model Artifacts Path
    MODEL_DIR: Path = BASE_DIR / "ml_models"

settings = Settings()
