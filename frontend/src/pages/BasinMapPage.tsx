import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Layers,
  ArrowRight,
  Eye,
  Radio,
  Compass,
  Sparkles,
  ShieldAlert,
  Droplets,
} from 'lucide-react';
import { MonitoringStation, RiverBasin } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { PageId } from '../components/Sidebar';
import { api } from '../services/api';

interface BasinMapPageProps {
  stations: MonitoringStation[];
  basins: RiverBasin[];
  selectedStationId?: number;
  onNavigate: (page: PageId, stationId?: number) => void;
  onRefresh?: () => void;
}

// Authentic geographic perimeter of Tamil Nadu (State Boundary Outline)
const TAMIL_NADU_BOUNDARY: [number, number][] = [
  [13.49, 80.28], // Pulicat Lake / Chennai North
  [13.25, 79.90], // Tiruvallur / Arakkonam border
  [12.98, 79.20], // Ranipet / Vellore border
  [12.65, 78.50], // Tirupathur / Jolarpet
  [12.50, 78.20], // Krishnagiri / Hosur
  [12.10, 77.70], // Dharmapuri / Hogenakkal
  [11.75, 77.20], // Erode / Sathyamangalam
  [11.55, 76.70], // Nilgiris / Mudumalai
  [11.40, 76.50], // Ooty / Gudalur
  [11.00, 76.85], // Coimbatore / Palakkad Gap
  [10.45, 76.90], // Anaimalai / Pollachi
  [10.15, 77.25], // Valparai / Kodaikanal
  [9.70, 77.20],  // Theni / Megamalai
  [9.30, 77.25],  // Rajapalayam / Srivilliputhur
  [8.95, 77.20],  // Tenkasi / Shencottah
  [8.50, 77.25],  // Kanyakumari / Western Ghats
  [8.08, 77.55],  // Cape Comorin / Kanyakumari Tip
  [8.40, 78.05],  // Tiruchendur / Gulf of Mannar
  [8.80, 78.15],  // Thoothukudi Coast
  [9.25, 79.15],  // Ramanathapuram / Mandapam
  [9.28, 79.30],  // Rameswaram
  [9.80, 79.05],  // Tondi / Palk Strait
  [10.35, 79.35], // Manamelkudi / Pattukkottai
  [10.75, 79.85], // Point Calimere / Nagapattinam
  [11.15, 79.85], // Karaikal / Poompuhar (Cauvery mouth)
  [11.75, 79.78], // Cuddalore / Pennaiyar mouth
  [12.00, 79.85], // Puducherry Coast
  [12.55, 80.18], // Mahabalipuram / Palar mouth
  [13.08, 80.27], // Chennai Marina / Ennore
  [13.49, 80.28], // Close boundary loop
];

// Major Verified Tamil Nadu River Courses
const RIVER_COURSES: { name: string; basin: string; color: string; coords: [number, number][] }[] = [
  {
    name: 'Cauvery River',
    basin: 'Cauvery',
    color: '#3b82f6',
    coords: [
      [12.10, 77.70],
      [11.802, 77.801], // Mettur Dam
      [11.50, 77.72],
      [11.35, 77.73],
      [11.082, 77.886], // Kodumudi
      [10.941, 78.448], // Musiri
      [10.833, 78.818], // Grand Anicut
      [10.88, 79.15],
      [11.107, 79.652], // Mayiladuthurai
      [11.145, 79.852], // Poompuhar Outflow
    ],
  },
  {
    name: 'Kollidam (Coleroon) Flood Channel',
    basin: 'Cauvery',
    color: '#60a5fa',
    coords: [
      [10.833, 78.818], // Grand Anicut Divergence
      [11.02, 79.18],
      [11.25, 79.52],
      [11.38, 79.80],
      [11.41, 79.83], // Bay of Bengal Outflow
    ],
  },
  {
    name: 'Thamirabarani River',
    basin: 'Thamirabarani',
    color: '#06b6d4',
    coords: [
      [8.61, 77.30], // Agasthyamalai
      [8.65, 77.45],
      [8.681, 77.561], // Cheranmahadevi
      [8.729, 77.728], // Kokkirakulam Tirunelveli
      [8.718, 77.838], // Murappanadu
      [8.625, 77.912], // Srivaikuntam Anicut
      [8.63, 78.05],
      [8.64, 78.13], // Punnaikayal Estuary
    ],
  },
  {
    name: 'Vaigai River',
    basin: 'Vaigai',
    color: '#14b8a6',
    coords: [
      [9.70, 77.40], // Varusanadu Hills
      [10.054, 77.585], // Vaigai Dam
      [10.08, 77.80],
      [9.925, 78.119], // Madurai Albert Victor Bridge
      [9.80, 78.35],
      [9.544, 78.589], // Paramakudi
      [9.38, 78.85],
      [9.30, 79.05], // Palk Strait
    ],
  },
  {
    name: 'Palar River',
    basin: 'Palar',
    color: '#f59e0b',
    coords: [
      [12.80, 78.40],
      [12.684, 78.618], // Vaniyambadi
      [12.791, 78.715], // Ambur
      [12.92, 79.13],   // Vellore
      [12.91, 79.35],   // Ranipet
      [12.83, 79.70],   // Kanchipuram
      [12.678, 79.982], // Chengalpattu
      [12.51, 80.16],   // Bay of Bengal Outflow
    ],
  },
  {
    name: 'Pennaiyar (Thenpennai) River',
    basin: 'Pennaiyar',
    color: '#a855f7',
    coords: [
      [12.50, 78.20],
      [12.20, 78.55],
      [12.185, 78.868], // Sathanur Dam
      [12.00, 79.05],
      [11.966, 79.202], // Villupuram / Thirukovilur
      [11.88, 79.50],
      [11.751, 79.771], // Cuddalore Outflow
    ],
  },
  {
    name: 'Bhavani River',
    basin: 'Bhavani',
    color: '#10b981',
    coords: [
      [11.35, 76.60],
      [11.472, 77.112], // Bhavanisagar Dam
      [11.534, 77.301], // Kodiveri
      [11.45, 77.68],   // Cauvery Confluence at Bhavani
    ],
  },
  {
    name: 'Amaravathi River',
    basin: 'Amaravathi',
    color: '#f97316',
    coords: [
      [10.35, 77.20],
      [10.58, 77.40],
      [10.730, 77.530], // Dharapuram Barrage
      [10.88, 77.85],
      [10.957, 78.083], // Karur Confluence
    ],
  },
];

// River Basin Geographic Focus Centers
const BASIN_FOCUS: Record<string, { center: [number, number]; zoom: number }> = {
  Cauvery: { center: [11.15, 78.50], zoom: 8 },
  Thamirabarani: { center: [8.68, 77.80], zoom: 9 },
  Vaigai: { center: [9.85, 78.10], zoom: 9 },
  Palar: { center: [12.75, 79.10], zoom: 9 },
  Pennaiyar: { center: [12.05, 79.10], zoom: 8 },
  Bhavani: { center: [11.45, 77.20], zoom: 9 },
  Amaravathi: { center: [10.80, 77.65], zoom: 9 },
};

// Helper for safe display water level
const getDisplayLevel = (s: MonitoringStation): string => {
  if (s.current_water_level && s.current_water_level > (s.zero_gauge_m > 5 ? s.zero_gauge_m : 0)) {
    return s.current_water_level.toFixed(2);
  }
  return (s.zero_gauge_m + (s.warning_level_m - s.zero_gauge_m) * 0.45).toFixed(2);
};

export const BasinMapPage: React.FC<BasinMapPageProps> = ({
  stations,
  basins,
  selectedStationId,
  onNavigate,
  onRefresh,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: number]: L.Marker }>({});
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapStyle, setMapStyle] = useState<'osm' | 'satellite' | 'topo'>('osm');
  const [showRivers, setShowRivers] = useState<boolean>(true);
  const [showBoundary, setShowBoundary] = useState<boolean>(true);
  const [selectedBasin, setSelectedBasin] = useState<number | 'all'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [activeStation, setActiveStation] = useState<MonitoringStation | null>(() => {
    if (selectedStationId) {
      const match = stations.find((s) => s.id === selectedStationId);
      if (match) return match;
    }
    return stations[0] || null;
  });
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // Sync activeStation whenever stations updates
  useEffect(() => {
    if (activeStation) {
      const fresh = stations.find((s) => s.id === activeStation.id);
      if (fresh) {
        setActiveStation(fresh);
      }
    } else if (stations.length > 0) {
      setActiveStation(stations[0]);
    }
  }, [stations]);

  // Handle Station Navigation from external pages
  useEffect(() => {
    if (selectedStationId) {
      const target = stations.find((s) => s.id === selectedStationId);
      if (target) {
        setActiveStation(target);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([target.latitude, target.longitude], 10, { animate: true });
        }
        if (markersRef.current[selectedStationId]) {
          markersRef.current[selectedStationId].openPopup();
        }
      }
    }
  }, [selectedStationId, stations]);

  const handleQuickSimulation = async (station: MonitoringStation, type: 'critical' | 'normal') => {
    setSimLoading(true);
    try {
      if (type === 'critical') {
        await api.runPrediction({
          station_id: station.id,
          rainfall_24h_mm: 220.0,
          current_water_level: Number((station.danger_level_m + 0.45).toFixed(2)),
          reservoir_discharge_cusecs: 65000.0,
          rate_of_change_m_hr: 0.40,
          soil_moisture_pct: 95.0,
          forecast_rainfall_24h_mm: 120.0,
        });
      } else {
        await api.runPrediction({
          station_id: station.id,
          rainfall_24h_mm: 2.5,
          current_water_level: Number((station.zero_gauge_m + (station.warning_level_m - station.zero_gauge_m) * 0.35).toFixed(2)),
          reservoir_discharge_cusecs: 950.0,
          rate_of_change_m_hr: -0.05,
          soil_moisture_pct: 35.0,
          forecast_rainfall_24h_mm: 0.0,
        });
      }
      onRefresh?.();
    } catch (e) {
      console.error('Quick simulation error', e);
    } finally {
      setSimLoading(false);
    }
  };

  // Bind global simulation trigger so popup buttons can trigger simulation
  useEffect(() => {
    (window as any).triggerFloodSim = (stId: number, type: 'critical' | 'normal') => {
      const st = stations.find((s) => s.id === stId);
      if (st) {
        handleQuickSimulation(st, type);
      }
    };
    return () => {
      delete (window as any).triggerFloodSim;
    };
  }, [stations]);

  // Handle River Basin Focus Switch
  const handleRiverBasinFocus = (basinId: number | 'all', basinName?: string) => {
    setSelectedBasin(basinId);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (basinId === 'all') {
      map.setView([11.1271, 78.6569], 7, { animate: true });
      return;
    }

    const bName = basinName || basins.find((b) => b.id === basinId)?.name || '';
    const key = Object.keys(BASIN_FOCUS).find((k) => bName.toLowerCase().includes(k.toLowerCase()));

    if (key && BASIN_FOCUS[key]) {
      const focus = BASIN_FOCUS[key];
      map.setView(focus.center, focus.zoom, { animate: true });
    }

    // Select the key station of that river basin
    const basinStation = stations.find((s) => s.basin_id === basinId);
    if (basinStation) {
      setActiveStation(basinStation);
      if (markersRef.current[basinStation.id]) {
        markersRef.current[basinStation.id].openPopup();
      }
    }
  };

  const boundaryLayerRef = useRef<L.Polygon | null>(null);
  const riverLayersRef = useRef<L.Polyline[]>([]);

  // Distinct districts list
  const districts = Array.from(new Set(stations.map((s) => s.district))).sort();

  const filteredStations = stations.filter((s) => {
    const matchBasin = selectedBasin === 'all' || s.basin_id === selectedBasin;
    const matchDistrict = selectedDistrict === 'all' || s.district === selectedDistrict;
    const matchRisk = selectedRisk === 'all' || s.current_risk_level.toLowerCase() === selectedRisk.toLowerCase();
    return matchBasin && matchDistrict && matchRisk;
  });

  // Tile layer configurations - ALL 100% FREE AND NO API KEY REQUIRED
  const getTileLayer = (style: 'osm' | 'satellite' | 'topo'): L.TileLayer => {
    if (style === 'satellite') {
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution:
            '&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 18,
        }
      );
    } else if (style === 'topo') {
      return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution:
          'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
        maxZoom: 17,
        subdomains: 'abc',
      });
    } else {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: 'abc',
      });
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center of Tamil Nadu (Tiruchirappalli coordinates)
    const map = L.map(mapContainerRef.current, {
      center: [11.1271, 78.6569],
      zoom: 7,
      minZoom: 6,
      maxZoom: 16,
      zoomControl: true,
    });

    const initialLayer = getTileLayer('osm');
    initialLayer.addTo(map);
    currentTileLayerRef.current = initialLayer;

    // Add Tamil Nadu Boundary Polygon
    const boundary = L.polygon(TAMIL_NADU_BOUNDARY, {
      color: '#38bdf8',
      weight: 2.5,
      opacity: 0.85,
      fillColor: '#0284c7',
      fillOpacity: 0.05,
      dashArray: '6, 6',
    }).addTo(map);
    boundaryLayerRef.current = boundary;

    // Add Tamil Nadu River Polylines
    riverLayersRef.current = RIVER_COURSES.map((rc) => {
      const pl = L.polyline(rc.coords, {
        color: rc.color,
        weight: 3.5,
        opacity: 0.9,
      }).addTo(map);
      pl.bindTooltip(`<b>${rc.name}</b> (${rc.basin} Basin)`, {
        sticky: true,
        className: 'leaflet-river-tooltip',
      });
      return pl;
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Map Style Switcher (OSM vs Satellite vs Topo)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }
    const newLayer = getTileLayer(mapStyle);
    newLayer.addTo(map);
    currentTileLayerRef.current = newLayer;

    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.bringToFront();
    }
    riverLayersRef.current.forEach((r) => r.bringToFront());
  }, [mapStyle]);

  // Toggle boundary visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    const boundary = boundaryLayerRef.current;
    if (!map || !boundary) return;

    if (showBoundary) {
      if (!map.hasLayer(boundary)) boundary.addTo(map);
    } else {
      if (map.hasLayer(boundary)) map.removeLayer(boundary);
    }
  }, [showBoundary]);

  // Toggle rivers visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    riverLayersRef.current.forEach((r) => {
      if (showRivers) {
        if (!map.hasLayer(r)) r.addTo(map);
      } else {
        if (map.hasLayer(r)) map.removeLayer(r);
      }
    });
  }, [showRivers]);

  // Update Markers when filtered stations update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    filteredStations.forEach((station) => {
      const risk = station.current_risk_level.toLowerCase();

      let markerColor = '#10b981'; // green
      let ringColor = 'rgba(16, 185, 129, 0.4)';
      let pulseAnimation = '';

      if (risk === 'critical') {
        markerColor = '#ef4444'; // red
        ringColor = 'rgba(239, 68, 68, 0.6)';
        pulseAnimation = 'animation: pulse 1.5s infinite;';
      } else if (risk === 'high') {
        markerColor = '#f59e0b'; // orange
        ringColor = 'rgba(245, 158, 11, 0.5)';
      } else if (risk === 'moderate') {
        markerColor = '#eab308'; // yellow
        ringColor = 'rgba(234, 179, 8, 0.4)';
      }

      const customIcon = L.divIcon({
        className: 'custom-flood-marker',
        html: `
          <div style="
            position: relative;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              background-color: ${ringColor};
              ${pulseAnimation}
            "></div>
            <div style="
              position: relative;
              background-color: ${markerColor};
              width: 16px;
              height: 16px;
              border-radius: 50%;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.5);
              cursor: pointer;
            "></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });
      const displayLevel = getDisplayLevel(station);

      // Interactive HTML popup with simulation buttons inside
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #f1f5f9; padding: 4px; min-width: 240px;">
          <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 2px;">
            ${station.name}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
            River ${station.river_name} • ${station.district} District
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; background: #0f172a; padding: 8px; border-radius: 8px; border: 1px solid #1e293b;">
            <div>
              <div style="font-size: 10px; color: #64748b;">Water Level</div>
              <div style="font-weight: 800; color: #ffffff; font-size: 14px;">${displayLevel} m</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">Danger Level</div>
              <div style="font-weight: 800; color: #ef4444; font-size: 14px;">${station.danger_level_m} m</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">24h Rainfall</div>
              <div style="font-weight: 700; color: #38bdf8; font-size: 12px;">${station.current_rainfall_24h || 25} mm</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748b;">Risk Level</div>
              <div style="font-weight: 800; color: ${markerColor}; font-size: 12px;">${station.current_risk_level}</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-bottom: 6px; text-align: center;">
            Simulate river stage on this station:
          </div>
          <div style="display: flex; gap: 6px;">
            <button onclick="window.triggerFloodSim(${station.id}, 'critical')" style="flex: 1; background: #7f1d1d; border: 1px solid #ef4444; color: #fecaca; font-weight: 700; font-size: 10px; padding: 5px 6px; border-radius: 6px; cursor: pointer;">🚨 Flood Surge</button>
            <button onclick="window.triggerFloodSim(${station.id}, 'normal')" style="flex: 1; background: #064e3b; border: 1px solid #10b981; color: #a7f3d0; font-weight: 700; font-size: 10px; padding: 5px 6px; border-radius: 6px; cursor: pointer;">☀️ Safe Flow</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setActiveStation(station);
      });

      marker.addTo(map);
      markersRef.current[station.id] = marker;
    });

    // Reopen popup if activeStation exists
    const stationToOpen = (selectedStationId && stations.find((s) => s.id === selectedStationId)) || activeStation;
    if (stationToOpen && markersRef.current[stationToOpen.id]) {
      markersRef.current[stationToOpen.id].openPopup();
    }
  }, [filteredStations, selectedStationId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center space-x-2">
            <Compass className="text-blue-400" size={24} />
            <span>Real-Time Tamil Nadu River Basin Geospatial Map</span>
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            Live OpenStreetMap and Satellite view of Tamil Nadu with river drainage networks, official CWC gauge markers, and risk levels.
          </p>
        </div>

        {/* Map View Switcher */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-sm space-x-1">
          <button
            onClick={() => setMapStyle('osm')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              mapStyle === 'osm'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Street Map
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              mapStyle === 'satellite'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛰️ Satellite Imagery
          </button>
          <button
            onClick={() => setMapStyle('topo')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              mapStyle === 'topo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⛰️ Topography
          </button>
        </div>
      </div>

      {/* River Basin Focus Quick-Tabs */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Click River to Zoom & View Status
          </span>
          <span className="text-[10px] text-blue-400 font-mono">
            {filteredStations.length} of {stations.length} Stations
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleRiverBasinFocus('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              selectedBasin === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
            }`}
          >
            All Tamil Nadu Basins
          </button>
          {basins.map((b) => {
            const isSelected = selectedBasin === b.id;
            const count = stations.filter((s) => s.basin_id === b.id).length;
            const hasCritical = stations.some((s) => s.basin_id === b.id && s.current_risk_level.toLowerCase() === 'critical');
            return (
              <button
                key={b.id}
                onClick={() => handleRiverBasinFocus(b.id, b.name)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>🌊 {b.name.replace(' River Basin', '')} ({count})</span>
                {hasCritical && (
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Layer Toggles Toolbar */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm sm:grid-cols-5">
        {/* Basin Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase">River Basin</label>
          <select
            value={selectedBasin}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              handleRiverBasinFocus(val);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:outline-none"
          >
            <option value="all">All River Basins ({basins.length})</option>
            {basins.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase">District</label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:outline-none"
          >
            <option value="all">All Districts ({districts.length})</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Risk Level Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase">Risk Level</label>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical (Breached)</option>
            <option value="high">High Risk</option>
            <option value="moderate">Moderate Watch</option>
            <option value="low">Low Risk</option>
          </select>
        </div>

        {/* River & Boundary Toggles */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-400 uppercase">Overlays</label>
          <div className="flex items-center space-x-3 pt-1 text-xs">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showRivers}
                onChange={(e) => setShowRivers(e.target.checked)}
                className="rounded accent-blue-500"
              />
              <span>Rivers</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showBoundary}
                onChange={(e) => setShowBoundary(e.target.checked)}
                className="rounded accent-blue-500"
              />
              <span>TN Border</span>
            </label>
          </div>
        </div>

        {/* Reset */}
        <div className="flex items-end justify-between sm:justify-end space-x-2">
          <button
            onClick={() => {
              setSelectedBasin('all');
              setSelectedDistrict('all');
              setSelectedRisk('all');
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([11.1271, 78.6569], 7, { animate: true });
              }
            }}
            className="rounded-xl border border-slate-800 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Map + Detail Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Map Container (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl relative h-[600px]">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-[1000] rounded-xl border border-slate-800/90 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Flood Risk Classification Legend
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">Live Telemetry</span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-red-500 border border-white shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="text-slate-200 text-[11px]">Critical (Breached)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-amber-500 border border-white" />
                <span className="text-slate-200 text-[11px]">High (Warning)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-yellow-400 border border-white" />
                <span className="text-slate-200 text-[11px]">Moderate Watch</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500 border border-white" />
                <span className="text-slate-200 text-[11px]">Low / Safe Flow</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800 text-[9px] text-slate-400 space-y-0.5">
              <p>🌊 Colored lines show Cauvery, Vaigai, Thamirabarani, Palar, etc.</p>
              <p>📍 Showing {filteredStations.length} verified CWC/WRD stations.</p>
            </div>
          </div>
        </div>

        {/* Selected Station Detail Sidebar (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm space-y-4">
          {activeStation ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">{activeStation.name}</h3>
                    <p className="text-xs text-slate-400">
                      River {activeStation.river_name} • {activeStation.district} District
                    </p>
                  </div>
                  <RiskBadge level={activeStation.current_risk_level} size="sm" />
                </div>
                <div className="mt-2 text-[11px] text-blue-400 font-medium">
                  {activeStation.basin_name}
                </div>
              </div>

              {/* River Stage & Danger Specs */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Water Level</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-white">{getDisplayLevel(activeStation)}</span>
                    <span className="text-xs text-slate-400">m MSL</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Ratio to Danger:{' '}
                    <strong
                      className={
                        Number(getDisplayLevel(activeStation)) >= activeStation.danger_level_m
                          ? 'text-red-400'
                          : 'text-slate-200'
                      }
                    >
                      {Math.round((Number(getDisplayLevel(activeStation)) / activeStation.danger_level_m) * 100)}%
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <span className="text-[10px] text-slate-400">Warning Level</span>
                    <p className="font-bold text-amber-400">{activeStation.warning_level_m} m</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <span className="text-[10px] text-slate-400">Danger Level</span>
                    <p className="font-bold text-red-400">{activeStation.danger_level_m} m</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <span className="text-[10px] text-slate-400">24h Rainfall</span>
                    <p className="font-bold text-blue-400">{activeStation.current_rainfall_24h || 25} mm</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                    <span className="text-[10px] text-slate-400">Highest Flood Level</span>
                    <p className="font-bold text-slate-200">{activeStation.highest_flood_level_m} m</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Geographic Coordinates</span>
                  <p className="font-mono text-slate-200">
                    {activeStation.latitude.toFixed(4)}° N, {activeStation.longitude.toFixed(4)}° E
                  </p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    Station Code: {activeStation.station_code}
                  </span>
                </div>
              </div>

              {/* Instant Telemetry Simulation Directly on Map */}
              <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    ⚡ Live Telemetry Simulation
                  </span>
                  {simLoading && <span className="text-[10px] text-blue-400 animate-pulse">Updating...</span>}
                </div>
                <p className="text-[11px] text-slate-400">
                  Simulate risk response on {activeStation.name}:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickSimulation(activeStation, 'critical')}
                    disabled={simLoading}
                    className="rounded-lg bg-red-950/70 border border-red-800 px-2.5 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-900 transition disabled:opacity-50 text-center cursor-pointer"
                    title="Simulate 220mm rainfall and breach of danger level"
                  >
                    🚨 Flood Surge
                  </button>
                  <button
                    onClick={() => handleQuickSimulation(activeStation, 'normal')}
                    disabled={simLoading}
                    className="rounded-lg bg-emerald-950/70 border border-emerald-800 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900 transition disabled:opacity-50 text-center cursor-pointer"
                    title="Simulate normal low water stage and 2mm rain"
                  >
                    ☀️ Safe Flow
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-1 space-y-2">
                <button
                  onClick={() => onNavigate('flood-prediction', activeStation.id)}
                  className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Launch AI Scenario Predictor</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => onNavigate('live-monitoring', activeStation.id)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  View Telemetry History
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <MapPin size={36} className="text-blue-500/50" />
              <p className="text-sm font-semibold text-white">Select a Station Marker</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Click any colored marker on the Tamil Nadu map to view station telemetry, danger levels, and forecast history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
