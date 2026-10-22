import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { AlertBanner } from './components/AlertBanner';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { FloodPredictionPage } from './pages/FloodPredictionPage';
import { BasinMapPage } from './pages/BasinMapPage';
import { AlertsPage } from './pages/AlertsPage';
import { HistoricalAnalyticsPage } from './pages/HistoricalAnalyticsPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { AboutPage } from './pages/AboutPage';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { api } from './services/api';
import { DashboardSummary, MonitoringStation, RiverBasin } from './types';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [stations, setStations] = useState<MonitoringStation[]>([]);
  const [basins, setBasins] = useState<RiverBasin[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [sumData, stData, bData] = await Promise.all([
        api.getDashboardSummary(),
        api.getStations(),
        api.getBasins(),
      ]);
      setSummary(sumData);
      setStations(stData);
      setBasins(bData);
      if (stData.length > 0 && !selectedStationId) {
        setSelectedStationId(stData[0].id);
      }
    } catch (e) {
      console.error('Failed to load application data', e);
    } finally {
      setIsRefreshing(false);
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNavigate = (page: PageId, stationId?: number) => {
    if (stationId) {
      setSelectedStationId(stationId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans">
      {/* Alert Banner if any critical active alerts exist */}
      {summary && (
        <AlertBanner
          alerts={summary.recent_alerts}
          onViewAlerts={() => handleNavigate('early-warnings')}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        stations={stations}
        selectedStationId={selectedStationId}
        onSelectStation={(id) => {
          setSelectedStationId(id);
          handleNavigate('live-monitoring', id);
        }}
        isDemoMode={summary ? summary.data_source_mode.includes('DEMO') : true}
        lastUpdated={summary?.last_data_update}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onSelectPage={(page) => handleNavigate(page)}
          activeAlertsCount={summary?.active_alerts_count || 0}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {loadingInitial ? (
              <div className="flex h-[60vh] flex-col items-center justify-center space-y-3 text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
                <p className="text-sm font-medium text-slate-300">
                  Initializing Tamil Nadu River Basin Telemetry...
                </p>
                <p className="text-xs text-slate-500">
                  Loading CWC gauge marks, IMD weather stations, and Random Forest models
                </p>
              </div>
            ) : (
              <>
                {currentPage === 'dashboard' && (
                  <DashboardPage
                    summary={summary}
                    stations={stations}
                    onNavigate={handleNavigate}
                    onRefresh={loadData}
                  />
                )}

                {currentPage === 'live-monitoring' && (
                  <LiveMonitoringPage
                    stations={stations}
                    basins={basins}
                    selectedStationId={selectedStationId}
                    onNavigate={handleNavigate}
                  />
                )}

                {currentPage === 'flood-prediction' && (
                  <FloodPredictionPage
                    stations={stations}
                    initialStationId={selectedStationId}
                    onPredictionUpdated={loadData}
                    onNavigate={handleNavigate}
                  />
                )}

                {currentPage === 'basin-map' && (
                  <BasinMapPage
                    stations={stations}
                    basins={basins}
                    selectedStationId={selectedStationId}
                    onNavigate={handleNavigate}
                    onRefresh={loadData}
                  />
                )}

                {currentPage === 'early-warnings' && (
                  <AlertsPage onRefresh={loadData} />
                )}

                {currentPage === 'historical-analytics' && (
                  <HistoricalAnalyticsPage
                    stations={stations}
                    basins={basins}
                  />
                )}

                {currentPage === 'model-performance' && (
                  <ModelPerformancePage />
                )}

                {currentPage === 'about' && <AboutPage />}

                {currentPage === 'data-sources' && <DataSourcesPage />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
