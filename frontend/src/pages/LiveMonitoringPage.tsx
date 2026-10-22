import React, { useState, useEffect } from 'react';
import {
  Waves,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Filter,
  BarChart2,
  Calendar,
  Layers,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { MonitoringStation, RiverBasin, HistoricalPoint } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';
import { PageId } from '../components/Sidebar';

interface LiveMonitoringPageProps {
  stations: MonitoringStation[];
  basins: RiverBasin[];
  selectedStationId?: number;
  onNavigate: (page: PageId, stationId?: number) => void;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  stations,
  basins,
  selectedStationId,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [selectedBasin, setSelectedBasin] = useState<number | 'all'>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [activeStation, setActiveStation] = useState<MonitoringStation | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (selectedStationId) {
      const match = stations.find((s) => s.id === selectedStationId);
      if (match) {
        handleViewStation(match);
      }
    }
  }, [selectedStationId, stations]);

  const handleViewStation = async (station: MonitoringStation) => {
    setActiveStation(station);
    setHistoryLoading(true);
    try {
      const res = await api.getStationHistory(station.id, 24);
      setHistoryData(res.points || []);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredStations = stations.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.district.toLowerCase().includes(search.toLowerCase()) ||
      s.river_name.toLowerCase().includes(search.toLowerCase());
    const matchesBasin = selectedBasin === 'all' || s.basin_id === selectedBasin;
    const matchesRisk = selectedRisk === 'all' || s.current_risk_level.toLowerCase() === selectedRisk.toLowerCase();
    return matchesSearch && matchesBasin && matchesRisk;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Live River Monitoring & Hydrological Telemetry
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            Gauge heights, flood danger thresholds, rate of rise, and reservoir discharge across 22 Tamil Nadu stations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
            Showing <strong className="text-white">{filteredStations.length}</strong> of {stations.length} stations
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by station, river, or district..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Basin Filter */}
        <div className="relative">
          <select
            value={selectedBasin}
            onChange={(e) => setSelectedBasin(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 px-3 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All River Basins</option>
            {basins.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.station_count} sites)
              </option>
            ))}
          </select>
        </div>

        {/* Risk Filter */}
        <div className="relative">
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 px-3 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Risk Categories</option>
            <option value="critical">Critical Risk Only</option>
            <option value="high">High Risk Only</option>
            <option value="moderate">Moderate Watch</option>
            <option value="low">Low / Normal</option>
          </select>
        </div>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredStations.map((station) => {
          const wl = station.current_water_level;
          const dl = station.danger_level_m;
          const wl_pct = Math.min(100, Math.max(0, Math.round(((wl - station.zero_gauge_m) / (dl - station.zero_gauge_m)) * 100)));
          const isDanger = wl >= dl;
          const isWarning = wl >= station.warning_level_m;

          return (
            <div
              key={station.id}
              className={`rounded-2xl border bg-slate-900/90 p-5 shadow-sm transition hover:border-slate-700 flex flex-col justify-between ${
                isDanger
                  ? 'border-red-900/80 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                  : isWarning
                  ? 'border-amber-900/60 bg-amber-950/10'
                  : 'border-slate-800'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm line-clamp-1">{station.name}</h3>
                    <p className="text-xs text-slate-400">
                      River {station.river_name} • {station.district}
                    </p>
                  </div>
                  <RiskBadge level={station.current_risk_level} size="sm" />
                </div>

                {/* Level Display */}
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">{wl}</span>
                    <span className="ml-1 text-xs text-slate-400">m MSL</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400">Danger: </span>
                    <strong className="text-red-400">{dl} m</strong>
                  </div>
                </div>

                {/* Visual Gauge Bar */}
                <div className="mt-3 space-y-1">
                  <div className="relative h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${wl_pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Zero: {station.zero_gauge_m}m</span>
                    <span>Warn: {station.warning_level_m}m</span>
                    <span>HFL: {station.highest_flood_level_m}m</span>
                  </div>
                </div>

                {/* Telemetry Stats Pill */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400">24h Rainfall</span>
                    <div className="font-semibold text-slate-200">{station.current_rainfall_24h} mm</div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400">Station Type</span>
                    <div className="font-semibold text-slate-200 line-clamp-1">{station.station_type}</div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleViewStation(station)}
                  className="flex items-center space-x-1 text-xs font-medium text-blue-400 hover:text-blue-300"
                >
                  <BarChart2 size={14} />
                  <span>24h Telemetry</span>
                </button>
                <button
                  onClick={() => onNavigate('flood-prediction', station.id)}
                  className="rounded-lg bg-blue-600/20 px-3 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-600 hover:text-white transition"
                >
                  Run Prediction
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 24h Telemetry Modal Drawer */}
      {activeStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white">{activeStation.name}</h3>
                  <RiskBadge level={activeStation.current_risk_level} size="sm" />
                </div>
                <p className="text-xs text-slate-400">
                  {activeStation.river_name} River • {activeStation.district} District • {activeStation.basin_name}
                </p>
              </div>
              <button
                onClick={() => setActiveStation(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {historyLoading ? (
              <div className="flex h-64 items-center justify-center text-slate-400 text-xs">
                Loading telemetry time series...
              </div>
            ) : historyData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-slate-400 text-xs">
                No recent telemetry records found.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        domain={[
                          (dataMin: number) => Math.floor(Math.min(dataMin, activeStation.warning_level_m - 2)),
                          (dataMax: number) => Math.ceil(Math.max(dataMax, activeStation.danger_level_m + 1)),
                        ]}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                      />
                      <ReferenceLine
                        y={activeStation.danger_level_m}
                        label={{ value: 'Danger Level', fill: '#ef4444', fontSize: 10, position: 'top' }}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                      />
                      <ReferenceLine
                        y={activeStation.warning_level_m}
                        label={{ value: 'Warning Level', fill: '#f59e0b', fontSize: 10, position: 'top' }}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                      />
                      <Area
                        type="monotone"
                        dataKey="water_level_m"
                        name="River Stage (m)"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#wlGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <span className="text-[10px] text-slate-400">Current Level</span>
                    <p className="text-sm font-bold text-white">{activeStation.current_water_level}m</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <span className="text-[10px] text-slate-400">Warning Level</span>
                    <p className="text-sm font-bold text-amber-400">{activeStation.warning_level_m}m</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <span className="text-[10px] text-slate-400">Danger Level</span>
                    <p className="text-sm font-bold text-red-400">{activeStation.danger_level_m}m</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <span className="text-[10px] text-slate-400">Highest Flood Level</span>
                    <p className="text-sm font-bold text-slate-200">{activeStation.highest_flood_level_m}m</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => {
                      const id = activeStation.id;
                      setActiveStation(null);
                      onNavigate('flood-prediction', id);
                    }}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    Simulate Scenario For This Station
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
