import React from 'react';
import {
  LayoutDashboard,
  Activity,
  BrainCircuit,
  Map as MapIcon,
  BellRing,
  LineChart,
  Gauge,
  Info,
  Database,
  ExternalLink,
  PhoneCall,
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'live-monitoring'
  | 'flood-prediction'
  | 'basin-map'
  | 'early-warnings'
  | 'historical-analytics'
  | 'model-performance'
  | 'about'
  | 'data-sources';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  activeAlertsCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  activeAlertsCount,
  isOpen,
  onClose,
}) => {
  const menuItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-monitoring' as PageId, label: 'Live River Monitoring', icon: Activity },
    { id: 'flood-prediction' as PageId, label: 'Flood Prediction (ML)', icon: BrainCircuit },
    { id: 'basin-map' as PageId, label: 'Interactive Basin Map', icon: MapIcon },
    {
      id: 'early-warnings' as PageId,
      label: 'Early Warnings & Alerts',
      icon: BellRing,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
      badgeColor: 'bg-red-600',
    },
    { id: 'historical-analytics' as PageId, label: 'Historical Analytics', icon: LineChart },
    { id: 'model-performance' as PageId, label: 'Model Performance', icon: Gauge },
    { id: 'about' as PageId, label: 'About & Methodology', icon: Info },
    { id: 'data-sources' as PageId, label: 'Data Sources & Limits', icon: Database },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 flex w-64 flex-col justify-between border-r border-slate-800 bg-slate-950 px-3 py-4 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Disaster Decision Support
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectPage(item.id);
                    onClose();
                  }}
                  className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      size={18}
                      className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Emergency Info Footer */}
        <div className="rounded-xl border border-blue-900/40 bg-gradient-to-b from-blue-950/40 to-slate-900/60 p-3 text-xs">
          <div className="flex items-center space-x-2 text-blue-400 font-semibold text-[11px] mb-1">
            <PhoneCall size={14} />
            <span>State Emergency Help</span>
          </div>
          <p className="text-[11px] text-slate-300">
            TN Disaster Control: <strong className="text-white">1070</strong>
          </p>
          <p className="text-[11px] text-slate-300">
            District Helpline: <strong className="text-white">1077</strong>
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>SDMA Tamil Nadu</span>
            <span className="flex items-center text-blue-400">
              verified <ExternalLink size={10} className="ml-1" />
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
