import React, { useState, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  Download,
  Calendar,
  Filter,
  Layers,
  Droplets,
  Waves,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { MonitoringStation, RiverBasin, HistoricalPoint } from '../types';
import { api } from '../services/api';

interface HistoricalAnalyticsPageProps {
  stations: MonitoringStation[];
  basins: RiverBasin[];
}

export const HistoricalAnalyticsPage: React.FC<HistoricalAnalyticsPageProps> = ({
  stations,
  basins,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<number>(stations[0]?.id || 1);
  const [hours, setHours] = useState<number>(48);
  const [historyPoints, setHistoryPoints] = useState<HistoricalPoint[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const selectedStation = stations.find((s) => s.id === selectedStationId) || stations[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [histRes, trendRes] = await Promise.all([
          api.getStationHistory(selectedStationId, hours),
          api.getMonthlyTrends(),
        ]);
        setHistoryPoints(histRes.points || []);
        setMonthlyTrends(trendRes.trends || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedStationId, hours]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center space-x-2">
            <LineChartIcon className="text-blue-400" size={24} />
            <span>Historical Hydrological Analytics & Seasonal Trends</span>
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            Temporal time-series correlation between precipitation, upstream discharge, and river water levels across Tamil Nadu river basins.
          </p>
        </div>

        <a
          href={api.getExportUrl(selectedStationId)}
          download
          className="flex items-center space-x-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition shadow-sm"
        >
          <Download size={14} />
          <span>Export Permitted CSV</span>
        </a>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase">Select Station</label>
          <select
            value={selectedStationId}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:outline-none"
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.river_name} • {s.district})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase">Time Window</label>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:outline-none"
          >
            <option value={24}>Past 24 Hours</option>
            <option value={48}>Past 48 Hours</option>
            <option value={72}>Past 72 Hours</option>
            <option value={168}>Past 7 Days</option>
          </select>
        </div>

        <div className="flex items-end text-xs text-slate-400 pb-1">
          <span>
            Basin: <strong className="text-white">{selectedStation?.basin_name}</strong> • Danger:{' '}
            <strong className="text-red-400">{selectedStation?.danger_level_m}m</strong>
          </span>
        </div>
      </div>

      {/* Primary Chart: Water Level vs 24h Rainfall (Dual Axis) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-white">
              River Stage vs. Precipitation Correlation ({selectedStation?.name})
            </h3>
            <p className="text-xs text-slate-400">
              Dual-axis graph plotting river gauge elevation (m MSL, left) and rainfall volume (mm, right).
            </p>
          </div>
          <span className="text-[10px] text-slate-500">Hourly Telemetry Observations</span>
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center text-xs text-slate-400">
            Loading historical series...
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historyPoints} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  stroke="#3b82f6"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Water Level (m)', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 10 }}
                  domain={[
                    (dataMin: number) => Math.floor(Math.min(dataMin, selectedStation.warning_level_m - 2)),
                    (dataMax: number) => Math.ceil(Math.max(dataMax, selectedStation.danger_level_m + 1)),
                  ]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#06b6d4"
                  tick={{ fontSize: 10 }}
                  label={{ value: '24h Rain (mm)', angle: 90, position: 'insideRight', fill: '#06b6d4', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine
                  yAxisId="left"
                  y={selectedStation.danger_level_m}
                  label={{ value: 'Danger Level', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  yAxisId="left"
                  y={selectedStation.warning_level_m}
                  label={{ value: 'Warning Level', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                />
                <Bar
                  yAxisId="right"
                  dataKey="rainfall_24h_mm"
                  name="24h Rainfall (mm)"
                  fill="#06b6d4"
                  opacity={0.4}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="water_level_m"
                  name="Water Level (m)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3b82f6' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly & Seasonal Cyclonic Trends Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Seasonal Flood Event Distribution (2021–2026)</h3>
            <p className="text-xs text-slate-400">
              Historical count of flood threat incidents across Tamil Nadu river basins by month.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="flood_events" name="Severe Inundation Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="mean_rainfall_mm"
                  name="Mean Rainfall (mm)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-200">Hydrological Insight:</span>
            <p>
              October to December (Northeast Monsoon) accounts for over 72% of annual severe flood alerts across Tamil Nadu coastal and delta basins (Palar, Pennaiyar, Cauvery, Thamirabarani).
            </p>
          </div>
        </div>

        {/* Station Danger Ratio Comparison */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Cross-Station Water Level Comparison</h3>
            <p className="text-xs text-slate-400">
              Current river gauge stage expressed as percentage of official Danger Mark.
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
            {stations.map((st) => {
              const pct = Math.round((st.current_water_level / st.danger_level_m) * 100);
              const isCrit = pct >= 100;
              const isHigh = pct >= 90;

              return (
                <div key={st.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300">
                      {st.name} <span className="text-slate-500">({st.district})</span>
                    </span>
                    <span
                      className={`font-bold ${
                        isCrit ? 'text-red-400' : isHigh ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      {st.current_water_level}m ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isCrit ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
