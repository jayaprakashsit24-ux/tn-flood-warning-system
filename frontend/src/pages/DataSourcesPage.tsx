import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DataSourceStatus } from '../types';
import { api } from '../services/api';

export const DataSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<DataSourceStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const data = await api.getDataSourcesStatus();
        setSources(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center space-x-2">
          <Database className="text-blue-400" size={24} />
          <span>Data Sources, Integration Layer & System Limitations</span>
        </h2>
        <p className="text-xs text-slate-400 sm:text-sm">
          Transparent accounting of telemetry ingestion pipelines, provider interfaces, and operational boundaries.
        </p>
      </div>

      {/* DEMO MODE Transparency Card */}
      <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
          <AlertCircle size={18} />
          <span>DEMO MODE Architecture Active</span>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          In strict compliance with academic and disaster-safety protocols, this instance runs with synthetic/calibrated telemetry inspired by real historical cyclonic deluge events (e.g., Cyclone Michaung 2023, Cyclone Mandous, SW Monsoon Mettur Dam surplus releases). <strong>Simulated data is never disguised as real-time government telemetry.</strong> When authorized CWC or IMD API credentials are configured in <code>.env</code>, the backend seamlessly switches to live gateway feeds.
        </p>
      </div>

      {/* Provider Status Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Active Telemetry Providers & Freshness</h3>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-xs text-slate-400">
            Checking provider status...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => (
              <div
                key={src.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{src.source_name}</h4>
                    <p className="text-xs text-slate-400">{src.service_name}</p>
                  </div>
                  <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{src.status}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  {src.message}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <span className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span>Last Sync: {new Date(src.last_sync_time).toLocaleTimeString()}</span>
                  </span>
                  <span>{src.records_count.toLocaleString()} observations logged</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Limitations and Future Improvements */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white">Known Constraints & Roadmap</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-400 uppercase text-[10px] tracking-wider">
              Current System Boundaries
            </h4>
            <ul className="text-slate-300 space-y-1.5 list-disc pl-4">
              <li>Bathymetric channel geometry is approximated using Mean Sea Level zero gauge and historical cross-sections.</li>
              <li>Micro-topographical urban street drainage (e.g., Chennai stormwater network) is distinct from primary river basins.</li>
              <li>Tidal surge interactions in delta estuaries (Poompuhar, Punnaikayal, Cuddalore) require 2D hydrodynamic coupling (such as HEC-RAS or SWMM).</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-emerald-400 uppercase text-[10px] tracking-wider">
              Future Improvements
            </h4>
            <ul className="text-slate-300 space-y-1.5 list-disc pl-4">
              <li>Integration with Sentinel-1 SAR satellite flood extent imagery for ground-truth water layer validation.</li>
              <li>Long Short-Term Memory (LSTM) recurrent neural network integration alongside Random Forest for sub-hourly hydrographs.</li>
              <li>Automated SMS gateway integration with CDAC emergency push messaging for authorized civil defense personnel.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
