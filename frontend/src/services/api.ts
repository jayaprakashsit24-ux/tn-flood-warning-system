import {
  DashboardSummary,
  RiverBasin,
  MonitoringStation,
  MonitoringStationDetail,
  AlertItem,
  PredictionHistory,
  ModelMetrics,
  DataSourceStatus,
  HistoricalPoint,
  PredictionRequestPayload,
} from '../types';

const API_BASE = 'https://tn-flood-warning-system.onrender.com/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    if (!res.ok) throw new Error('Failed to load dashboard summary');
    return res.json();
  },

  async getBasins(): Promise<RiverBasin[]> {
    const res = await fetch(`${API_BASE}/basins`);
    if (!res.ok) throw new Error('Failed to load river basins');
    return res.json();
  },

  async getStations(params?: { basin_id?: number; district?: string; risk_level?: string }): Promise<MonitoringStation[]> {
    const url = new URL(`${API_BASE}/stations`);
    if (params?.basin_id) url.searchParams.append('basin_id', params.basin_id.toString());
    if (params?.district) url.searchParams.append('district', params.district);
    if (params?.risk_level) url.searchParams.append('risk_level', params.risk_level);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to load stations');
    return res.json();
  },

  async getStationDetail(stationId: number): Promise<MonitoringStationDetail> {
    const res = await fetch(`${API_BASE}/stations/${stationId}`);
    if (!res.ok) throw new Error(`Failed to load station ${stationId}`);
    return res.json();
  },

  async runPrediction(payload: PredictionRequestPayload) {
    const res = await fetch(`${API_BASE}/predictions/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Prediction failed');
    }
    return res.json();
  },

  async getPredictions(stationId?: number): Promise<PredictionHistory[]> {
    const url = new URL(`${API_BASE}/predictions`);
    if (stationId) url.searchParams.append('station_id', stationId.toString());
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to load predictions');
    return res.json();
  },

  async getAlerts(params?: { status?: string; risk_level?: string }): Promise<AlertItem[]> {
    const url = new URL(`${API_BASE}/alerts`);
    if (params?.status) url.searchParams.append('status', params.status);
    if (params?.risk_level) url.searchParams.append('risk_level', params.risk_level);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to load alerts');
    return res.json();
  },

  async acknowledgeAlert(alertId: number, acknowledgedBy: string = 'Disaster Management Officer') {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
  },

  async resolveAlert(alertId: number, resolvedBy: string = 'Disaster Management Officer', notes?: string) {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved_by: resolvedBy, resolution_notes: notes }),
    });
    if (!res.ok) throw new Error('Failed to resolve alert');
    return res.json();
  },

  async getStationHistory(stationId: number, hours: number = 24): Promise<{ station_id: number; station_name: string; river_name: string; district: string; points: HistoricalPoint[] }> {
    const res = await fetch(`${API_BASE}/history?station_id=${stationId}&hours=${hours}`);
    if (!res.ok) throw new Error('Failed to load historical data');
    return res.json();
  },

  async getMonthlyTrends(): Promise<{ trends: { month: string; mean_rainfall_mm: number; flood_events: number; season: string }[] }> {
    const res = await fetch(`${API_BASE}/history/monthly`);
    if (!res.ok) throw new Error('Failed to load monthly trends');
    return res.json();
  },

  async getModelMetrics(): Promise<ModelMetrics> {
    const res = await fetch(`${API_BASE}/model/metrics`);
    if (!res.ok) throw new Error('Failed to load model metrics');
    return res.json();
  },

  async getDataSourcesStatus(): Promise<DataSourceStatus[]> {
    const res = await fetch(`${API_BASE}/datasources/status`);
    if (!res.ok) throw new Error('Failed to load data sources status');
    return res.json();
  },

  getExportUrl(stationId?: number): string {
    return stationId ? `${API_BASE}/history/export?station_id=${stationId}` : `${API_BASE}/history/export`;
  }
};
