import React from 'react';
import {
  Waves,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
  Menu,
} from 'lucide-react';
import { MonitoringStation } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  stations: MonitoringStation[];
  selectedStationId?: number;
  onSelectStation: (id: number) => void;
  isDemoMode: boolean;
  lastUpdated?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  stations,
  selectedStationId,
  onSelectStation,
  isDemoMode,
  lastUpdated,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          title="Toggle Navigation"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 shadow-md shadow-blue-500/20">
            <Waves className="text-white" size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">
                TN-FLOODWATCH
              </h1>
              {isDemoMode && (
                <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                  DEMO MODE (Simulated Telemetry)
                </span>
              )}
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Real-Time Flood Prediction & Early Warning System • Tamil Nadu River Basins
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Quick Station Switcher */}
        <div className="hidden md:flex items-center space-x-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-300">
          <MapPin size={14} className="text-blue-400" />
          <select
            value={selectedStationId || ''}
            onChange={(e) => onSelectStation(Number(e.target.value))}
            className="bg-transparent text-xs text-white focus:outline-none"
          >
            <option value="" disabled className="bg-slate-900 text-slate-400">
              Select Monitoring Station
            </option>
            {stations.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.name} ({s.district})
              </option>
            ))}
          </select>
        </div>

        {/* Live Status indicator */}
        <div className="hidden sm:flex items-center space-x-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 text-xs text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-[11px]">Telemetry Live</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
          title="Refresh live telemetry observations"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
          <span className="hidden xl:inline">Sync</span>
        </button>

        {/* Timestamp */}
        {lastUpdated && (
          <div className="hidden lg:flex items-center space-x-1 text-[11px] text-slate-400">
            <Clock size={12} />
            <span>{new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>
    </header>
  );
};
