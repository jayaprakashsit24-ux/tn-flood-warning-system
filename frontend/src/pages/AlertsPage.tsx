import React, { useState, useEffect } from 'react';
import {
  BellRing,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Check,
  RotateCcw,
  Clock,
  MapPin,
  ListChecks,
  PhoneCall,
  Search,
  Filter,
} from 'lucide-react';
import { AlertItem } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';

interface AlertsPageProps {
  onRefresh: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onRefresh }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data);
      if (data.length > 0 && !selectedAlert) {
        setSelectedAlert(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (alertId: number) => {
    setActionLoading(true);
    try {
      const updated = await api.acknowledgeAlert(alertId, 'Revenue Disaster Officer');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      setSelectedAlert(updated);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (alertId: number) => {
    setActionLoading(true);
    try {
      const updated = await api.resolveAlert(alertId, 'Chief Water Resources Engineer', 'Water levels receded safely.');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      setSelectedAlert(updated);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchStatus = statusFilter === 'all' || a.status.toLowerCase() === statusFilter.toLowerCase();
    const matchRisk = riskFilter === 'all' || a.risk_level.toLowerCase() === riskFilter.toLowerCase();
    return matchStatus && matchRisk;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center space-x-2">
            <BellRing className="text-red-400" size={24} />
            <span>Early Warnings & Disaster Alert Management</span>
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            Automated flood threat generation, multi-stage acknowledge/resolve workflows, and duplicate suppression.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
        >
          <RotateCcw size={14} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-sm">
        <div className="flex items-center space-x-2">
          {['all', 'Active', 'Acknowledged', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Severity:</span>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Alerts List (5 cols) & Detail Card (7 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Alerts Feed List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-400">
              Loading alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
              <CheckCircle size={36} className="text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-white">No Matching Alerts</p>
              <p className="text-xs text-slate-500 mt-1">There are no warnings matching the selected filter.</p>
            </div>
          ) : (
            filteredAlerts.map((a) => {
              const isSelected = selectedAlert?.id === a.id;
              const isCritical = a.risk_level === 'Critical';

              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAlert(a)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-slate-800/90 shadow-md ring-1 ring-blue-500/50'
                      : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <RiskBadge level={a.risk_level} size="sm" />
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            a.status === 'Active'
                              ? 'bg-red-500/20 text-red-300'
                              : a.status === 'Acknowledged'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs">{a.station_name}</h4>
                      <p className="text-[11px] text-slate-400">{a.basin_name} • {a.district}</p>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 shrink-0 flex items-center space-x-1">
                      <Clock size={11} />
                      <span>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-300 line-clamp-2">{a.reason}</p>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400">
                    <span>Observed: <strong className="text-white">{a.observed_water_level}m</strong></span>
                    <span>Predicted 24h: <strong className="text-amber-300">{a.predicted_water_level}m</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Alert Full Detail & SOP Execution */}
        <div className="lg:col-span-7">
          {selectedAlert ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-6">
              {/* Header */}
              <div className="border-b border-slate-800 pb-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <RiskBadge level={selectedAlert.risk_level} size="md" />
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                        selectedAlert.status === 'Active'
                          ? 'bg-red-500/20 text-red-300'
                          : selectedAlert.status === 'Acknowledged'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {selectedAlert.status}
                    </span>
                  </div>

                  <span className="font-mono text-xs text-slate-400">
                    {selectedAlert.alert_code}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{selectedAlert.station_name}</h3>
                <p className="text-xs text-slate-400">
                  {selectedAlert.basin_name} • {selectedAlert.district} District • Telemetry Station ID #{selectedAlert.station_id}
                </p>
              </div>

              {/* Alert Reason & Breach Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Threat Description & Breach Criteria
                </h4>
                <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-xs text-red-200 space-y-2">
                  <p className="leading-relaxed font-medium">{selectedAlert.reason}</p>
                  <p className="text-[11px] text-red-300/80">
                    <strong>Threshold Factor:</strong> {selectedAlert.threshold_exceeded}
                  </p>
                </div>
              </div>

              {/* Observed vs Forecast Levels */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Observed Gauge Level</span>
                  <p className="text-xl font-bold text-white">{selectedAlert.observed_water_level} m MSL</p>
                  <span className="text-[10px] text-slate-500">Live Telemetry Measurement</span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Predicted 24h Ahead</span>
                  <p className="text-xl font-bold text-amber-300">{selectedAlert.predicted_water_level} m MSL</p>
                  <span className="text-[10px] text-slate-500">ML Forecast Horizon (24h)</span>
                </div>
              </div>

              {/* Actionable SOP Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <ListChecks size={15} className="text-blue-400" />
                  <span>Standard Operating Procedures (SOP)</span>
                </h4>

                <div className="space-y-2">
                  {selectedAlert.recommended_actions.map((act, i) => (
                    <div
                      key={i}
                      className="flex items-start space-x-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200"
                    >
                      <CheckCircle size={15} className="text-blue-400 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timestamps & Audit Trail */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Triggered At:</span>
                  <strong className="text-slate-200">{new Date(selectedAlert.created_at).toLocaleString()}</strong>
                </div>
                {selectedAlert.acknowledged_at && (
                  <div className="flex justify-between">
                    <span>Acknowledged At:</span>
                    <strong className="text-amber-300">
                      {new Date(selectedAlert.acknowledged_at).toLocaleString()} by {selectedAlert.acknowledged_by}
                    </strong>
                  </div>
                )}
                {selectedAlert.resolved_at && (
                  <div className="flex justify-between">
                    <span>Resolved At:</span>
                    <strong className="text-emerald-300">
                      {new Date(selectedAlert.resolved_at).toLocaleString()} by {selectedAlert.resolved_by}
                    </strong>
                  </div>
                )}
              </div>

              {/* Officer Workflow Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                {selectedAlert.status === 'Active' && (
                  <button
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    disabled={actionLoading}
                    className="flex items-center space-x-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500 transition disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>Acknowledge Warning</span>
                  </button>
                )}

                {selectedAlert.status !== 'Resolved' && (
                  <button
                    onClick={() => handleResolve(selectedAlert.id)}
                    disabled={actionLoading}
                    className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    <span>Mark Alert Resolved</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
              <p className="text-sm">Select an alert from the left column to view actions and details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
