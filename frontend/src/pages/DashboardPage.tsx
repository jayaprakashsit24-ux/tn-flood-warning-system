import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Droplets,
  Gauge,
  Waves,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DashboardSummary, MonitoringStation } from '../types';
import { MetricCard } from '../components/MetricCard';
import { RiskBadge } from '../components/RiskBadge';
import { PageId } from '../components/Sidebar';

interface DashboardPageProps {
  summary: DashboardSummary | null;
  stations: MonitoringStation[];
  onNavigate: (page: PageId, stationId?: number) => void;
  onRefresh: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  summary,
  stations,
  onNavigate,
}) => {
  if (!summary) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-2 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span>Loading flood telemetry and prediction models...</span>
        </div>
      </div>
    );
  }

  const highRiskTotal = summary.high_risk_stations_count + summary.critical_risk_stations_count;
  const criticalStations = stations.filter((s) => s.current_risk_level === 'Critical');
  const highStations = stations.filter((s) => s.current_risk_level === 'High');

  return (
    <div className="space-y-6">
      {/* Top Welcome & Summary Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Tamil Nadu River Basin Flood Intelligence
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            AI-driven early warning telemetry across Cauvery, Thamirabarani, Vaigai, Palar, and Pennaiyar basins.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('flood-prediction')}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 transition hover:from-blue-500 hover:to-cyan-500"
          >
            <Sparkles size={15} />
            <span>Simulate Flood Scenario</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Active Monitoring Stations"
          value={summary.total_monitoring_stations}
          unit="Sites"
          subtitle="All verified CWC/WRD posts"
          icon={Gauge}
          variant="default"
        />

        <MetricCard
          title="Critical Flood Threats"
          value={summary.critical_risk_stations_count}
          unit="Locations"
          subtitle="Water level at/above danger"
          icon={ShieldAlert}
          variant={summary.critical_risk_stations_count > 0 ? 'danger' : 'default'}
        />

        <MetricCard
          title="High Warning Locations"
          value={summary.high_risk_stations_count}
          unit="Locations"
          subtitle="Approaching danger thresholds"
          icon={AlertTriangle}
          variant={summary.high_risk_stations_count > 0 ? 'warning' : 'default'}
        />

        <MetricCard
          title="Mean 24h Rainfall"
          value={summary.mean_rainfall_24h_mm}
          unit="mm"
          subtitle="Catchment basin average"
          icon={Droplets}
          variant={summary.mean_rainfall_24h_mm > 64 ? 'warning' : 'info'}
        />

        <MetricCard
          title="Peak River Stage"
          value={summary.max_recorded_level_m}
          unit="m MSL"
          subtitle={summary.max_level_station_name}
          icon={Waves}
          variant="default"
        />
      </div>

      {/* Risk Distribution & Urgent Alerts Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Risk Distribution Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">River Basin Risk Distribution</h3>
            <span className="text-xs text-slate-400">{summary.total_monitoring_stations} Total</span>
          </div>

          <div className="space-y-3">
            {[
              {
                label: 'Critical Risk',
                count: summary.risk_distribution.Critical || 0,
                color: 'bg-red-500',
                textColor: 'text-red-400',
                desc: 'Danger level breached; immediate SOP',
              },
              {
                label: 'High Risk',
                count: summary.risk_distribution.High || 0,
                color: 'bg-amber-500',
                textColor: 'text-amber-400',
                desc: 'Warning level breached; watch active',
              },
              {
                label: 'Moderate Watch',
                count: summary.risk_distribution.Moderate || 0,
                color: 'bg-yellow-500',
                textColor: 'text-yellow-400',
                desc: 'Elevated inflow / heavy rain watch',
              },
              {
                label: 'Low / Normal',
                count: summary.risk_distribution.Low || 0,
                color: 'bg-emerald-500',
                textColor: 'text-emerald-400',
                desc: 'Gauge within safe carrying capacity',
              },
            ].map((item) => {
              const pct = summary.total_monitoring_stations > 0
                ? Math.round((item.count / summary.total_monitoring_stations) * 100)
                : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{item.label}</span>
                    <span className={`font-bold ${item.textColor}`}>
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full ${item.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => onNavigate('basin-map')}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <span>Explore Interactive Map</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Live Early Warnings Feed */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="text-red-400" size={18} />
                <h3 className="text-sm font-semibold text-white">Active Early Warnings</h3>
              </div>
              <button
                onClick={() => onNavigate('early-warnings')}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center space-x-1"
              >
                <span>View All Alerts ({summary.active_alerts_count})</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {summary.recent_alerts.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/60 text-emerald-400 mb-2">
                  ✓
                </span>
                <p className="text-sm font-medium text-white">No Active Emergency Alerts</p>
                <p className="text-xs text-slate-400">All Tamil Nadu river basin gauges are currently within safe thresholds.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.recent_alerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-red-900/40 bg-red-950/20 p-3.5 transition hover:border-red-800/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <RiskBadge level={alert.risk_level} size="sm" />
                          <span className="font-semibold text-white text-xs">
                            {alert.station_name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • {alert.basin_name} ({alert.district})
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-1">{alert.reason}</p>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                          <span>Observed: <strong className="text-white">{alert.observed_water_level}m</strong></span>
                          <span>Predicted 24h: <strong className="text-amber-300">{alert.predicted_water_level}m</strong></span>
                          <span className="flex items-center space-x-1">
                            <Clock size={11} />
                            <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate('early-warnings')}
                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 shrink-0"
                      >
                        Action
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Duplicate suppression active (4-hr window)</span>
            <span className="text-amber-400">Alerts comply with CWC SOP criteria</span>
          </div>
        </div>
      </div>

      {/* Critical & High Risk Stations Highlight Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-white">Priority River Monitoring Stations</h3>
            <p className="text-xs text-slate-400">
              Stations classified under heightened or critical watch based on real-time gauge telemetry and ML predictions.
            </p>
          </div>
          <button
            onClick={() => onNavigate('live-monitoring')}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <span>View All 22 Stations</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Station & River</th>
                <th className="py-2.5 px-3 font-medium">Basin / District</th>
                <th className="py-2.5 px-3 font-medium">Current Water Level</th>
                <th className="py-2.5 px-3 font-medium">Warning / Danger Mark</th>
                <th className="py-2.5 px-3 font-medium">24h Rainfall</th>
                <th className="py-2.5 px-3 font-medium">Current Risk</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stations.slice(0, 7).map((st) => {
                const ratioPct = Math.min(100, Math.round((st.current_water_level / st.danger_level_m) * 100));
                return (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{st.name}</div>
                      <div className="text-[11px] text-slate-400">{st.river_name} River</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-200">{st.basin_name}</div>
                      <div className="text-[11px] text-slate-400">{st.district}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-sm">{st.current_water_level} m</div>
                      <div className="text-[10px] text-slate-400">{ratioPct}% of danger level</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-300">Warn: {st.warning_level_m} m</div>
                      <div className="text-red-400 font-medium">Danger: {st.danger_level_m} m</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{st.current_rainfall_24h} mm</div>
                      <div className="text-[10px] text-slate-400">
                        {st.current_rainfall_24h >= 64.5 ? 'Heavy Rain' : 'Normal'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <RiskBadge level={st.current_risk_level} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => onNavigate('flood-prediction', st.id)}
                        className="rounded-lg bg-blue-600/20 px-2.5 py-1 text-xs font-medium text-blue-300 hover:bg-blue-600 hover:text-white transition"
                      >
                        Predict
                      </button>
                      <button
                        onClick={() => onNavigate('live-monitoring', st.id)}
                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                      >
                        History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
