import React from 'react';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { AlertItem } from '../types';

interface AlertBannerProps {
  alerts: AlertItem[];
  onViewAlerts: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onViewAlerts }) => {
  const [dismissed, setDismissed] = React.useState(false);

  const criticalAlerts = alerts.filter(
    (a) => a.risk_level === 'Critical' && a.status === 'Active'
  );

  if (dismissed || criticalAlerts.length === 0) {
    return null;
  }

  const latestAlert = criticalAlerts[0];

  return (
    <div className="relative border-b border-red-900/60 bg-gradient-to-r from-red-950/90 via-red-900/80 to-slate-900 px-4 py-3 text-red-200 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600/30 text-red-400 ring-1 ring-red-500/50 animate-pulse">
            <ShieldAlert size={18} />
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-bold text-red-300 uppercase tracking-wider">
                Critical Alert
              </span>
              <span className="font-semibold text-white">
                {latestAlert.station_name} ({latestAlert.basin_name})
              </span>
            </div>
            <p className="text-xs text-red-200/90 line-clamp-1">{latestAlert.reason}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onViewAlerts}
            className="flex items-center space-x-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
          >
            <span>View All ({criticalAlerts.length})</span>
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-red-300 hover:bg-red-900/50 hover:text-white"
            title="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
