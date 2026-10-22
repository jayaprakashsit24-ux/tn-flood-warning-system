import logging
from typing import Dict, Any

logger = logging.getLogger("FloodNotificationService")

class NotificationService:
    """Safe Notification dispatcher for early warnings."""

    def __init__(self):
        self.enabled = False  # Disabled by default to protect against unauthorized SMS/emergency broadcasts

    def dispatch_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Log or dispatch notification to authorized disaster channels."""
        # Log safely to console/logger
        logger.info(
            f"[EARLY WARNING DISPATCH] Code={alert_data.get('alert_code')} | "
            f"Level={alert_data.get('risk_level')} | Station={alert_data.get('station_name')} | "
            f"Reason={alert_data.get('reason')}"
        )
        return True

notification_service = NotificationService()
