import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Droplets,
  Gauge,
  Waves,
  CheckCircle2,
  ListChecks,
  Info,
  RotateCcw,
  ArrowRight,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { MonitoringStation, PredictionRequestPayload, FeatureImportance } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';
import { PageId } from '../components/Sidebar';

interface FloodPredictionPageProps {
  stations: MonitoringStation[];
  initialStationId?: number;
  onPredictionUpdated?: () => void;
  onNavigate?: (page: PageId, stationId?: number) => void;
}

// Helper to safely get realistic water level (never 0m for elevated zero gauges)
const getSafeWaterLevel = (station?: MonitoringStation): number => {
  if (!station) return 10.0;
  if (station.current_water_level && station.current_water_level > (station.zero_gauge_m > 5 ? station.zero_gauge_m : 0)) {
    return Number(station.current_water_level.toFixed(2));
  }
  return Number((station.zero_gauge_m + (station.warning_level_m - station.zero_gauge_m) * 0.45).toFixed(2));
};

export const FloodPredictionPage: React.FC<FloodPredictionPageProps> = ({
  stations,
  initialStationId,
  onPredictionUpdated,
  onNavigate,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<number>(
    initialStationId || (stations[0] ? stations[0].id : 1)
  );
  const [selectedBasinFilter, setSelectedBasinFilter] = useState<string>('all');

  const selectedStation = stations.find((s) => s.id === selectedStationId) || stations[0];

  // Distinct river basin names
  const basinNames = Array.from(new Set(stations.map((s) => s.basin_name).filter(Boolean))).sort();

  // Filter stations by chosen basin
  const basinStations = stations.filter((s) => {
    if (selectedBasinFilter === 'all') return true;
    return s.basin_name.toLowerCase().includes(selectedBasinFilter.toLowerCase());
  });

  // Simulation parameters state
  const [rainfall24h, setRainfall24h] = useState<number>(() =>
    selectedStation?.current_rainfall_24h && selectedStation.current_rainfall_24h > 0
      ? selectedStation.current_rainfall_24h
      : 35.0
  );
  const [forecastRainfall, setForecastRainfall] = useState<number>(25.0);
  const [currentLevel, setCurrentLevel] = useState<number>(() => getSafeWaterLevel(selectedStation));
  const [discharge, setDischarge] = useState<number>(4500.0);
  const [soilMoisture, setSoilMoisture] = useState<number>(65.0);
  const [rateOfChange, setRateOfChange] = useState<number>(0.08);

  // Prediction output state
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Update input values when selected station changes
  useEffect(() => {
    if (selectedStation) {
      setCurrentLevel(getSafeWaterLevel(selectedStation));
      setRainfall24h(
        selectedStation.current_rainfall_24h && selectedStation.current_rainfall_24h > 0
          ? selectedStation.current_rainfall_24h
          : 35.0
      );
    }
  }, [selectedStationId, stations]);

  // Handle River Basin Tab Switch
  const handleBasinFilterChange = (basinName: string) => {
    setSelectedBasinFilter(basinName);
    if (basinName !== 'all') {
      const match = stations.find((s) => s.basin_name.toLowerCase().includes(basinName.toLowerCase()));
      if (match) {
        setSelectedStationId(match.id);
        setCurrentLevel(getSafeWaterLevel(match));
      }
    }
  };

  // Preset scenarios
  const applyScenario = (scenario: string, stationToUse: MonitoringStation = selectedStation) => {
    if (!stationToUse) return;
    const dl = stationToUse.danger_level_m;
    const wl = stationToUse.warning_level_m;
    const zg = stationToUse.zero_gauge_m;

    let r24 = 45.0;
    let f24 = 30.0;
    let wlVal = getSafeWaterLevel(stationToUse);
    let dis = 5000.0;
    let sm = 65.0;
    let roc = 0.08;

    if (scenario === 'michaung') {
      // Extreme Deluge (Breach Danger Level)
      r24 = 240.0;
      f24 = 140.0;
      wlVal = Number((dl + 0.45).toFixed(2));
      dis = 65000.0;
      sm = 95.0;
      roc = 0.45;
    } else if (scenario === 'mettur_surplus') {
      // High reservoir flood release
      r24 = 85.0;
      f24 = 65.0;
      wlVal = Number((wl + (dl - wl) * 0.85).toFixed(2));
      dis = 95000.0;
      sm = 85.0;
      roc = 0.25;
    } else if (scenario === 'moderate_surge') {
      // Moderate Watch
      r24 = 45.0;
      f24 = 30.0;
      wlVal = Number((zg + (wl - zg) * 0.85).toFixed(2));
      dis = 8500.0;
      sm = 68.0;
      roc = 0.08;
    } else if (scenario === 'dry_baseline') {
      // Dry normal
      r24 = 2.0;
      f24 = 0.0;
      wlVal = Number((zg + (wl - zg) * 0.35).toFixed(2));
      dis = 950.0;
      sm = 35.0;
      roc = -0.05;
    }

    setRainfall24h(r24);
    setForecastRainfall(f24);
    setCurrentLevel(wlVal);
    setDischarge(dis);
    setSoilMoisture(sm);
    setRateOfChange(roc);

    // Auto run with these parameters
    executePrediction(stationToUse, {
      rainfall_24h_mm: r24,
      forecast_rainfall_24h_mm: f24,
      current_water_level: wlVal,
      reservoir_discharge_cusecs: dis,
      soil_moisture_pct: sm,
      rate_of_change_m_hr: roc,
    });
  };

  // Quick River Flood Test helper
  const handleQuickRiverTest = (stationCode: string, scenarioType: 'michaung' | 'dry_baseline') => {
    const target = stations.find((s) => s.station_code === stationCode || s.name.toLowerCase().includes(stationCode.toLowerCase()));
    if (target) {
      setSelectedStationId(target.id);
      applyScenario(scenarioType, target);
    }
  };

  const executePrediction = async (
    targetStation: MonitoringStation = selectedStation,
    customParams?: Partial<PredictionRequestPayload>
  ) => {
    if (!targetStation) return;
    setIsPredicting(true);
    setErrorMsg(null);

    const safeLevel = customParams?.current_water_level !== undefined ? customParams.current_water_level : currentLevel;
    const levelToUse = safeLevel > 0 ? safeLevel : getSafeWaterLevel(targetStation);

    const r24 = customParams?.rainfall_24h_mm !== undefined ? customParams.rainfall_24h_mm : rainfall24h;

    const payload: PredictionRequestPayload = {
      station_id: targetStation.id,
      rainfall_24h_mm: r24,
      forecast_rainfall_24h_mm: customParams?.forecast_rainfall_24h_mm !== undefined ? customParams.forecast_rainfall_24h_mm : forecastRainfall,
      current_water_level: levelToUse,
      reservoir_discharge_cusecs: customParams?.reservoir_discharge_cusecs !== undefined ? customParams.reservoir_discharge_cusecs : discharge,
      soil_moisture_pct: customParams?.soil_moisture_pct !== undefined ? customParams.soil_moisture_pct : soilMoisture,
      rate_of_change_m_hr: customParams?.rate_of_change_m_hr !== undefined ? customParams.rate_of_change_m_hr : rateOfChange,
      rainfall_1h_mm: Number((r24 * 0.15).toFixed(1)),
      rainfall_6h_mm: Number((r24 * 0.45).toFixed(1)),
      rainfall_72h_mm: Number((r24 * 1.5).toFixed(1)),
      temperature_c: 27.5,
      humidity_pct: 80.0,
    };

    try {
      const res = await api.runPrediction(payload);
      setPredictionResult(res);
      setSyncNotice(
        `Prediction saved! ${res.station_name} on ${targetStation.river_name} River updated to ${res.predicted_risk_level} (${res.predicted_water_level_24h}m). Real-time telemetry synchronized across Map and Dashboard.`
      );
      onPredictionUpdated?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Prediction execution failed');
    } finally {
      setIsPredicting(false);
    }
  };

  // Run initial prediction once on mount
  useEffect(() => {
    if (selectedStation && !predictionResult) {
      executePrediction(selectedStation);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Synchronization Notification Banner with direct 1-click Map action */}
      {syncNotice && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-800/80 bg-emerald-950/50 p-4 text-xs text-emerald-200 shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-emerald-100">{syncNotice}</span>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                The interactive Tamil Nadu Geospatial Map marker has updated its color and water stage for this river.
              </p>
            </div>
          </div>
          {onNavigate && selectedStation && (
            <button
              onClick={() => onNavigate('basin-map', selectedStation.id)}
              className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 transition shrink-0 shadow-md shadow-emerald-700/30 cursor-pointer"
            >
              <span>🗺️ View On Real-Time Map</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center space-x-2">
            <BrainCircuit className="text-blue-400" size={24} />
            <span>AI Flood Prediction & River Basin Scenario Testbed</span>
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            Select any river basin in Tamil Nadu, adjust rainfall or flood release, and watch real-time risk updates reflect instantly on the geospatial map.
          </p>
        </div>

        {/* Quick View Map Button */}
        {onNavigate && (
          <button
            onClick={() => onNavigate('basin-map', selectedStation?.id)}
            className="flex items-center space-x-2 rounded-xl border border-blue-800/80 bg-blue-950/60 px-3.5 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-900/60 transition cursor-pointer"
          >
            <MapPin size={15} className="text-blue-400" />
            <span>Open Tamil Nadu Map</span>
            <ExternalLink size={13} className="text-blue-400" />
          </button>
        )}
      </div>

      {/* River Basin Quick Selector Tabs */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Select River Basin to Simulate
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleBasinFilterChange('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              selectedBasinFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            All River Basins ({stations.length})
          </button>
          {basinNames.map((bn) => {
            const shortName = bn.replace(' River Basin', '').trim();
            const count = stations.filter((s) => s.basin_name === bn).length;
            const isSelected = selectedBasinFilter.toLowerCase() === shortName.toLowerCase();
            return (
              <button
                key={bn}
                onClick={() => handleBasinFilterChange(shortName)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                🌊 {shortName} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Control Panel (Left) & Prediction Output (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Input Form & Scenarios (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Station Selection Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Monitoring Station</h3>
              <span className="text-[11px] text-blue-400 font-medium">
                {selectedStation?.basin_name}
              </span>
            </div>

            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              {basinStations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.river_name} River • {s.district})
                </option>
              ))}
            </select>

            {selectedStation && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="rounded-xl bg-slate-950/70 p-2 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400">Zero Gauge</span>
                  <p className="font-bold text-white">{selectedStation.zero_gauge_m}m</p>
                </div>
                <div className="rounded-xl bg-amber-950/30 p-2 border border-amber-900/40">
                  <span className="text-[10px] text-amber-300">Warning Mark</span>
                  <p className="font-bold text-amber-400">{selectedStation.warning_level_m}m</p>
                </div>
                <div className="rounded-xl bg-red-950/30 p-2 border border-red-900/40">
                  <span className="text-[10px] text-red-300">Danger Mark</span>
                  <p className="font-bold text-red-400">{selectedStation.danger_level_m}m</p>
                </div>
              </div>
            )}
          </div>

          {/* Preset Scenarios Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-1.5">
                <Sparkles size={16} className="text-cyan-400" />
                <span>Simulation Scenarios for Selected River</span>
              </h3>
              <span className="text-[11px] text-slate-400">1-Click Run</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => applyScenario('michaung')}
                className="rounded-xl border border-red-900/60 bg-red-950/30 p-2.5 text-left text-red-300 hover:bg-red-900/40 transition cursor-pointer"
              >
                <div className="font-semibold text-red-200 flex items-center space-x-1">
                  <span>🚨 Flood Surge</span>
                </div>
                <p className="text-[10px] text-red-300/80">240mm rain, breaches danger</p>
              </button>

              <button
                onClick={() => applyScenario('mettur_surplus')}
                className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-2.5 text-left text-amber-300 hover:bg-amber-900/40 transition cursor-pointer"
              >
                <div className="font-semibold text-amber-200">🌊 Dam Discharge</div>
                <p className="text-[10px] text-amber-300/80">95k cusecs flood release</p>
              </button>

              <button
                onClick={() => applyScenario('moderate_surge')}
                className="rounded-xl border border-yellow-900/60 bg-yellow-950/30 p-2.5 text-left text-yellow-300 hover:bg-yellow-900/40 transition cursor-pointer"
              >
                <div className="font-semibold text-yellow-200">🌦️ Monsoon Watch</div>
                <p className="text-[10px] text-yellow-300/80">45mm rain, rising gauge</p>
              </button>

              <button
                onClick={() => applyScenario('dry_baseline')}
                className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-2.5 text-left text-emerald-300 hover:bg-emerald-900/40 transition cursor-pointer"
              >
                <div className="font-semibold text-emerald-200">☀️ Safe Flow</div>
                <p className="text-[10px] text-emerald-300/80">Normal low river stage</p>
              </button>
            </div>
          </div>

          {/* Quick River Multi-Test Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ⚡ Test Flood Surge on Different TN Rivers
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleQuickRiverTest('CAU-MET-01', 'michaung')}
                className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-left hover:border-red-700 transition cursor-pointer"
              >
                <div className="font-semibold text-white">Cauvery River</div>
                <p className="text-[10px] text-red-400">Surge at Mettur Dam</p>
              </button>
              <button
                onClick={() => handleQuickRiverTest('THAM-CHE-06', 'michaung')}
                className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-left hover:border-red-700 transition cursor-pointer"
              >
                <div className="font-semibold text-white">Thamirabarani River</div>
                <p className="text-[10px] text-red-400">Surge at Cheranmahadevi</p>
              </button>
              <button
                onClick={() => handleQuickRiverTest('VAI-MAD-11', 'michaung')}
                className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-left hover:border-red-700 transition cursor-pointer"
              >
                <div className="font-semibold text-white">Vaigai River</div>
                <p className="text-[10px] text-red-400">Surge at Madurai Bridge</p>
              </button>
              <button
                onClick={() => handleQuickRiverTest('PAL-CHE-15', 'michaung')}
                className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-left hover:border-red-700 transition cursor-pointer"
              >
                <div className="font-semibold text-white">Palar River</div>
                <p className="text-[10px] text-red-400">Surge at Chengalpattu</p>
              </button>
            </div>
          </div>

          {/* Hydrological Parameter Sliders */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white">Fine-Tune Hydrological Parameters</h3>

            {/* 24h Rainfall */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">24-Hour Rainfall</span>
                <span className="font-bold text-blue-400">{rainfall24h} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="350"
                step="5"
                value={rainfall24h}
                onChange={(e) => setRainfall24h(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 mm</span>
                <span>64.5mm (Heavy)</span>
                <span>204mm (Extremely Heavy)</span>
              </div>
            </div>

            {/* Forecast Rainfall */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Forecast Next 24h Rainfall</span>
                <span className="font-bold text-cyan-400">{forecastRainfall} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="250"
                step="5"
                value={forecastRainfall}
                onChange={(e) => setForecastRainfall(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Current River Water Level */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Current River Gauge Level</span>
                <span className="font-bold text-white">{currentLevel} m</span>
              </div>
              <input
                type="range"
                min={selectedStation ? selectedStation.zero_gauge_m : 0}
                max={selectedStation ? Number((selectedStation.highest_flood_level_m + 2).toFixed(1)) : 300}
                step="0.1"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Zero Gauge: {selectedStation?.zero_gauge_m}m</span>
                <span className="text-red-400 font-semibold">Danger Level: {selectedStation?.danger_level_m}m</span>
              </div>
            </div>

            {/* Reservoir Discharge */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Reservoir Discharge / Upstream Flow</span>
                <span className="font-bold text-amber-400">{discharge.toLocaleString()} cusecs</span>
              </div>
              <input
                type="range"
                min="0"
                max="120000"
                step="2000"
                value={discharge}
                onChange={(e) => setDischarge(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Soil Moisture */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Catchment Soil Moisture</span>
                <span className="font-bold text-emerald-400">{soilMoisture} %</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={soilMoisture}
                onChange={(e) => setSoilMoisture(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Gauge Rise Rate */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Rate of Rise (m/hr)</span>
                <span className="font-bold text-purple-400">{rateOfChange} m/hr</span>
              </div>
              <input
                type="range"
                min="-0.2"
                max="0.8"
                step="0.02"
                value={rateOfChange}
                onChange={(e) => setRateOfChange(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={() => executePrediction(selectedStation)}
              disabled={isPredicting}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <BrainCircuit size={16} className={isPredicting ? 'animate-spin' : ''} />
              <span>{isPredicting ? 'Running Random Forest Model...' : 'Execute ML Flood Prediction'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Prediction Results & Explainability (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {errorMsg && (
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {predictionResult ? (
            <>
              {/* Primary Prediction Verdict Card */}
              <div
                className={`rounded-2xl border p-6 shadow-md transition-all ${
                  predictionResult.predicted_risk_level === 'Critical'
                    ? 'border-red-800 bg-gradient-to-br from-red-950/90 via-slate-900 to-slate-950 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
                    : predictionResult.predicted_risk_level === 'High'
                    ? 'border-amber-800 bg-gradient-to-br from-amber-950/90 via-slate-900 to-slate-950'
                    : predictionResult.predicted_risk_level === 'Moderate'
                    ? 'border-yellow-800 bg-gradient-to-br from-yellow-950/80 via-slate-900 to-slate-950'
                    : 'border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Machine Learning Prediction Outcome
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      {predictionResult.station_name}
                    </h3>
                    <p className="text-xs text-slate-300">
                      River {selectedStation?.river_name} • {predictionResult.basin_name} • {predictionResult.district} District
                    </p>
                  </div>
                  <RiskBadge level={predictionResult.predicted_risk_level} size="lg" />
                </div>

                {/* Probability & Forecast Metrics */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Calibrated Flood Probability */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                    <span className="text-[11px] text-slate-400">Flood Inundation Probability</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-black text-white">
                        {Math.round(predictionResult.flood_probability * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${
                          predictionResult.flood_probability > 0.75
                            ? 'bg-red-500'
                            : predictionResult.flood_probability > 0.45
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.round(predictionResult.flood_probability * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">Calibrated ensemble probability</span>
                  </div>

                  {/* Predicted 24h Ahead Water Level */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-1">
                    <span className="text-[11px] text-slate-400">Predicted 24h Water Level</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-black text-amber-300">
                        {predictionResult.predicted_water_level_24h}
                      </span>
                      <span className="text-xs text-slate-400">m MSL</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Danger Mark: <strong className="text-red-400">{predictionResult.danger_level_m}m</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">Random Forest Regressor (MAE: 0.15m)</p>
                  </div>

                  {/* Warning Delta */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-1">
                    <span className="text-[11px] text-slate-400">Delta to Danger Threshold</span>
                    {(() => {
                      const diff = Number((predictionResult.predicted_water_level_24h - predictionResult.danger_level_m).toFixed(2));
                      const isBreach = diff >= 0;
                      return (
                        <>
                          <div className={`text-2xl font-black ${isBreach ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isBreach ? `+${diff} m` : `${diff} m`}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {isBreach ? '⚠️ Breaches Danger Mark!' : 'Safe Below Danger Mark'}
                          </p>
                          <span className="text-[10px] text-slate-500">24h Forecast Horizon</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Direct Action: Jump to this River Station on Map */}
                {onNavigate && (
                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-300">
                      Want to see this river station's location and drainage network?
                    </span>
                    <button
                      onClick={() => onNavigate('basin-map', selectedStation.id)}
                      className="flex items-center justify-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-blue-600/30 cursor-pointer"
                    >
                      <MapPin size={15} />
                      <span>View {selectedStation.name} on Live Map</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* Alert Trigger Status Banner */}
                {predictionResult.created_alert && (
                  <div className="mt-4 rounded-xl border border-red-800 bg-red-950/60 p-3 text-xs text-red-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert size={16} className="text-red-400 shrink-0" />
                      <span>
                        <strong>Early Warning Dispatched:</strong> {predictionResult.created_alert.alert_code} ({predictionResult.created_alert.risk_level})
                      </span>
                    </div>
                    <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      Active
                    </span>
                  </div>
                )}
              </div>

              {/* Explainable AI: Feature Importance Chart */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Feature Influence on Model Prediction</h3>
                    <p className="text-xs text-slate-400">
                      Gini importance & feature contribution breakdown for this specific scenario.
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500">Model: RF-v2.1-tn</span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={predictionResult.feature_importance.slice(0, 6)}
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        stroke="#94a3b8"
                        tick={{ fontSize: 10 }}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                      />
                      <Bar dataKey="importance" name="Relative Weight" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {predictionResult.feature_importance.slice(0, 6).map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#3b82f6'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recommended Safety Actions (SOP) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-3">
                <div className="flex items-center space-x-2">
                  <ListChecks className="text-blue-400" size={18} />
                  <h3 className="text-sm font-semibold text-white">Recommended Safety Protocols (SOP)</h3>
                </div>

                <ul className="space-y-2">
                  {predictionResult.recommended_actions.map((act: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-start space-x-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs text-slate-200"
                    >
                      <CheckCircle2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
              <BrainCircuit size={48} className="text-slate-600 mb-3 animate-pulse" />
              <p className="text-sm font-medium text-white">Computing Model Prediction...</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Evaluating rainfall, river water level, and catchment saturation for {selectedStation?.name}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
