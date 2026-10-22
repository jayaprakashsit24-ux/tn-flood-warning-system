import React from 'react';
import {
  Info,
  ShieldAlert,
  PhoneCall,
  ExternalLink,
  Layers,
  Cpu,
  Database,
  Globe,
  Terminal,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center space-x-2">
          <Info className="text-blue-400" size={24} />
          <span>About the Tamil Nadu Flood Early Warning System</span>
        </h2>
        <p className="text-xs text-slate-400 sm:text-sm">
          A real-time machine learning disaster decision-support framework engineered for Tamil Nadu river basins.
        </p>
      </div>

      {/* Prominent Mandatory Public Safety Disclaimer */}
      <div className="rounded-2xl border border-red-800 bg-red-950/40 p-5 shadow-lg space-y-2">
        <div className="flex items-center space-x-2 text-red-400 font-bold text-sm">
          <ShieldAlert size={20} />
          <span>Official Public Safety Notice & Disclaimer</span>
        </div>
        <p className="text-xs text-red-200/90 leading-relaxed">
          This application provides experimental flood-risk estimates for research, academic evaluation, and decision support. Predictions may be inaccurate or delayed. Always follow official government warnings and instructions issued by the Tamil Nadu State Disaster Management Authority (TNSDMA), District Collectors, and Central Water Commission. <strong>Do not use this application as the sole basis for evacuation or other safety-critical decisions.</strong>
        </p>
      </div>

      {/* Problem Statement & Background */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-white">Problem Statement & Regional Hydrology</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Tamil Nadu is highly vulnerable to seasonal floods during the Northeast Monsoon (October to December), when cyclonic depressions in the Bay of Bengal produce intense rainfall bursts across coastal and delta basins (such as Palar, Pennaiyar, and Thamirabarani). Simultaneously, the Cauvery and Bhavani basins encounter massive surplus discharge pulses during the Southwest Monsoon (July to August) when Western Ghats reservoirs (e.g., Mettur, Bhavanisagar, Harangi, KRS) reach full capacity.
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          Traditional river monitoring often depends on static gauge readings with manual transmission delays. This system demonstrates how automated telemetry ingestion combined with supervised Random Forest machine learning can forecast flood risks 24 hours in advance, classify threats into Low, Moderate, High, and Critical tiers, and trigger actionable Standard Operating Procedures (SOPs).
        </p>
      </div>

      {/* System Architecture Diagram */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white">System Architecture & Technical Stack</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Layer 1: Data Integration */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-semibold">
              <Globe size={16} />
              <span>1. Data Providers</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li>• CWC Telemetry (River Stage)</li>
              <li>• IMD / Open-Meteo AWS</li>
              <li>• TN WRD Dam Inflow/Discharge</li>
              <li>• Configurable Provider Layer</li>
            </ul>
          </div>

          {/* Layer 2: Backend API */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-blue-400 font-semibold">
              <Terminal size={16} />
              <span>2. FastAPI Core</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li>• REST API Endpoints</li>
              <li>• Pydantic Request Validation</li>
              <li>• SQLAlchemy 2.0 ORM</li>
              <li>• SQLite / PostgreSQL Adaptable</li>
            </ul>
          </div>

          {/* Layer 3: ML Engine */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold">
              <Cpu size={16} />
              <span>3. ML Intelligence</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li>• Random Forest Classifier (Risk)</li>
              <li>• Random Forest Regressor (24h WL)</li>
              <li>• Calibrated Probabilities</li>
              <li>• Time-Aware Test Validation</li>
            </ul>
          </div>

          {/* Layer 4: Modern UI */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
              <Layers size={16} />
              <span>4. Frontend UX</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li>• React 19 + TypeScript + Vite</li>
              <li>• Tailwind CSS Responsive Theme</li>
              <li>• Leaflet OpenStreetMap Engine</li>
              <li>• Recharts Hydrological Visuals</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Verified Government Sources & Helplines */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <PhoneCall size={18} className="text-blue-400" />
          <span>Official Emergency Contacts & Authoritative Resources</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="font-semibold text-white">State Disaster Management Authority (TNSDMA)</div>
            <p className="text-slate-400 text-[11px]">State Emergency Operation Centre (SEOC)</p>
            <p className="text-blue-400 font-bold">Helpline: 1070 (Toll-Free, 24x7)</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="font-semibold text-white">District Disaster Management Authority (DDMA)</div>
            <p className="text-slate-400 text-[11px]">District Emergency Operation Centre (DEOC)</p>
            <p className="text-blue-400 font-bold">Helpline: 1077 (All TN Districts)</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="font-semibold text-white">Central Water Commission (CWC)</div>
            <p className="text-slate-400 text-[11px]">Flood Inundation & Dam Safety Monitoring</p>
            <a href="http://cwc.gov.in" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center space-x-1">
              <span>cwc.gov.in</span>
              <ExternalLink size={11} />
            </a>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-1">
            <div className="font-semibold text-white">India Meteorological Department (IMD)</div>
            <p className="text-slate-400 text-[11px]">Regional Meteorological Centre, Chennai</p>
            <a href="https://mausam.imd.gov.in/chennai" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center space-x-1">
              <span>mausam.imd.gov.in/chennai</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
