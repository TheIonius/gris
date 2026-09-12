import React, { useState, useEffect } from 'react';
import {
  Car,
  Info,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Navigation,
  Filter,
  Compass
} from 'lucide-react';

const TLC_ZONES = [
  {
    id: 230,
    name: 'Times Sq / Theatre District',
    shortName: 'Times Square',
    borough: 'Manhattan',
    x: 185,
    y: 160,
    labelPos: { dx: -14, dy: 3, anchor: 'end' },
    lat: 40.7580,
    lon: -73.9855,
    baseDemand: 'Peak',
    peakTripsHr: 240,
    areaType: 'Entertainment Core',
    topDestinations: [
      { id: 161, name: 'Midtown Center', pct: 36 },
      { id: 132, name: 'JFK Airport', pct: 18 },
      { id: 236, name: 'Upper East Side', pct: 15 },
      { id: 87,  name: 'Financial District', pct: 11 }
    ],
    hourlyProfile: [60, 36, 24, 19, 19, 36, 84, 156, 204, 192, 180, 173, 180, 175, 182, 192, 211, 235, 240, 228, 204, 168, 132, 96]
  },
  {
    id: 161,
    name: 'Midtown Center',
    shortName: 'Midtown Center',
    borough: 'Manhattan',
    x: 260,
    y: 165,
    labelPos: { dx: 14, dy: 3, anchor: 'start' },
    lat: 40.7550,
    lon: -73.9780,
    baseDemand: 'Peak',
    peakTripsHr: 280,
    areaType: 'Business District',
    topDestinations: [
      { id: 230, name: 'Times Square', pct: 32 },
      { id: 132, name: 'JFK Airport', pct: 22 },
      { id: 138, name: 'LaGuardia', pct: 18 },
      { id: 255, name: 'Williamsburg', pct: 12 }
    ],
    hourlyProfile: [70, 42, 28, 22, 22, 42, 98, 182, 238, 224, 210, 202, 210, 204, 213, 224, 246, 274, 280, 266, 238, 196, 154, 112]
  },
  {
    id: 87,
    name: 'Financial District North',
    shortName: 'Wall St / FiDi',
    borough: 'Manhattan',
    x: 135,
    y: 315,
    labelPos: { dx: -14, dy: 3, anchor: 'end' },
    lat: 40.7090,
    lon: -74.0090,
    baseDemand: 'High',
    peakTripsHr: 180,
    areaType: 'Financial Core',
    topDestinations: [
      { id: 161, name: 'Midtown Center', pct: 34 },
      { id: 61,  name: 'DUMBO', pct: 24 },
      { id: 132, name: 'JFK Airport', pct: 16 },
      { id: 79,  name: 'East Village', pct: 12 }
    ],
    hourlyProfile: [45, 27, 18, 14, 14, 27, 63, 117, 153, 144, 135, 130, 135, 131, 137, 144, 158, 176, 180, 171, 153, 126, 99, 72]
  },
  {
    id: 236,
    name: 'Upper East Side North',
    shortName: 'UES North',
    borough: 'Manhattan',
    x: 275,
    y: 75,
    labelPos: { dx: 14, dy: 3, anchor: 'start' },
    lat: 40.7760,
    lon: -73.9530,
    baseDemand: 'High',
    peakTripsHr: 150,
    areaType: 'Residential Core',
    topDestinations: [
      { id: 161, name: 'Midtown Center', pct: 40 },
      { id: 230, name: 'Times Square', pct: 20 },
      { id: 138, name: 'LaGuardia', pct: 16 },
      { id: 87,  name: 'Financial District', pct: 10 }
    ],
    hourlyProfile: [38, 23, 15, 12, 12, 23, 53, 98, 128, 120, 113, 108, 113, 110, 114, 120, 132, 147, 150, 143, 128, 105, 83, 60]
  },
  {
    id: 237,
    name: 'Upper East Side South',
    shortName: 'UES South',
    borough: 'Manhattan',
    x: 265,
    y: 115,
    labelPos: { dx: 14, dy: 3, anchor: 'start' },
    lat: 40.7680,
    lon: -73.9600,
    baseDemand: 'High',
    peakTripsHr: 190,
    areaType: 'Retail & Medical',
    topDestinations: [
      { id: 161, name: 'Midtown Center', pct: 44 },
      { id: 230, name: 'Times Square', pct: 22 },
      { id: 132, name: 'JFK Airport', pct: 14 }
    ],
    hourlyProfile: [48, 29, 19, 15, 15, 29, 67, 124, 162, 152, 143, 137, 143, 139, 144, 152, 167, 186, 190, 181, 162, 133, 105, 76]
  },
  {
    id: 239,
    name: 'Upper West Side South',
    shortName: 'UWS / Lincoln',
    borough: 'Manhattan',
    x: 185,
    y: 95,
    labelPos: { dx: -14, dy: 3, anchor: 'end' },
    lat: 40.7770,
    lon: -73.9800,
    baseDemand: 'High',
    peakTripsHr: 160,
    areaType: 'Cultural Core',
    topDestinations: [
      { id: 161, name: 'Midtown Center', pct: 38 },
      { id: 230, name: 'Times Square', pct: 28 },
      { id: 87,  name: 'Financial District', pct: 14 }
    ],
    hourlyProfile: [40, 24, 16, 13, 13, 24, 56, 104, 136, 128, 120, 115, 120, 117, 122, 128, 141, 157, 160, 152, 136, 112, 88, 64]
  },
  {
    id: 79,
    name: 'East Village',
    shortName: 'East Village',
    borough: 'Manhattan',
    x: 215,
    y: 225,
    labelPos: { dx: 14, dy: 3, anchor: 'start' },
    lat: 40.7280,
    lon: -73.9840,
    baseDemand: 'Moderate',
    peakTripsHr: 140,
    areaType: 'Nightlife Core',
    topDestinations: [
      { id: 161, name: 'Midtown Center', pct: 30 },
      { id: 255, name: 'Williamsburg', pct: 28 },
      { id: 148, name: 'Lower East Side', pct: 20 },
      { id: 87,  name: 'Financial District', pct: 14 }
    ],
    hourlyProfile: [35, 21, 14, 11, 11, 21, 49, 91, 119, 112, 105, 101, 105, 102, 106, 112, 123, 137, 140, 133, 119, 98, 77, 56]
  },
  {
    id: 148,
    name: 'Lower East Side',
    shortName: 'Lower East Side',
    borough: 'Manhattan',
    x: 195,
    y: 270,
    labelPos: { dx: -14, dy: 3, anchor: 'end' },
    lat: 40.7180,
    lon: -73.9880,
    baseDemand: 'Moderate',
    peakTripsHr: 120,
    areaType: 'Waterfront Mixed',
    topDestinations: [
      { id: 255, name: 'Williamsburg', pct: 35 },
      { id: 87,  name: 'Financial District', pct: 25 },
      { id: 161, name: 'Midtown Center', pct: 22 }
    ],
    hourlyProfile: [30, 18, 12, 10, 10, 18, 42, 78, 102, 96, 90, 86, 90, 88, 91, 96, 106, 118, 120, 114, 102, 84, 66, 48]
  },
  {
    id: 61,
    name: 'DUMBO / Vinegar Hill',
    shortName: 'DUMBO',
    borough: 'Brooklyn',
    x: 225,
    y: 340,
    labelPos: { dx: 14, dy: 3, anchor: 'start' },
    lat: 40.7030,
    lon: -73.9890,
    baseDemand: 'Moderate',
    peakTripsHr: 90,
    areaType: 'Tech Hub',
    topDestinations: [
      { id: 87,  name: 'Financial District', pct: 42 },
      { id: 255, name: 'Williamsburg', pct: 26 },
      { id: 161, name: 'Midtown Center', pct: 20 }
    ],
    hourlyProfile: [23, 14, 9, 7, 7, 14, 32, 59, 77, 72, 68, 65, 68, 66, 68, 72, 79, 88, 90, 86, 77, 63, 50, 36]
  },
  {
    id: 255,
    name: 'Williamsburg South',
    shortName: 'Williamsburg',
    borough: 'Brooklyn',
    x: 325,
    y: 290,
    labelPos: { dx: 14, dy: 3, anchor: 'start' },
    lat: 40.7080,
    lon: -73.9570,
    baseDemand: 'High',
    peakTripsHr: 100,
    areaType: 'Creative Hub',
    topDestinations: [
      { id: 148, name: 'Lower East Side', pct: 38 },
      { id: 161, name: 'Midtown Center', pct: 28 },
      { id: 79,  name: 'East Village', pct: 20 }
    ],
    hourlyProfile: [25, 15, 10, 8, 8, 15, 35, 65, 85, 80, 75, 72, 75, 73, 76, 80, 88, 98, 100, 95, 85, 70, 55, 40]
  },
  {
    id: 138,
    name: 'LaGuardia Airport (LGA)',
    shortName: 'LGA Airport',
    borough: 'Queens',
    x: 520,
    y: 90,
    labelPos: { dx: 0, dy: -15, anchor: 'middle' },
    lat: 40.7769,
    lon: -73.8740,
    baseDemand: 'High',
    peakTripsHr: 120,
    areaType: 'Aviation Terminal',
    topDestinations: [
      { id: 161, name: 'Midtown Center', pct: 46 },
      { id: 236, name: 'Upper East Side', pct: 22 },
      { id: 230, name: 'Times Square', pct: 18 },
      { id: 87,  name: 'Financial District', pct: 10 }
    ],
    hourlyProfile: [30, 18, 12, 10, 10, 18, 42, 78, 102, 96, 90, 86, 90, 88, 91, 96, 106, 118, 120, 114, 102, 84, 66, 48]
  },
  {
    id: 132,
    name: 'JFK Airport (JFK)',
    shortName: 'JFK Airport',
    borough: 'Queens',
    x: 740,
    y: 335,
    labelPos: { dx: 0, dy: -16, anchor: 'middle' },
    lat: 40.6413,
    lon: -73.7781,
    baseDemand: 'Peak',
    peakTripsHr: 110,
    areaType: 'International Hub',
    topDestinations: [
      { id: 161, name: 'Midtown Center', pct: 44 },
      { id: 230, name: 'Times Square', pct: 26 },
      { id: 87,  name: 'Financial District', pct: 16 }
    ],
    hourlyProfile: [28, 17, 11, 9, 9, 17, 39, 72, 94, 88, 83, 79, 83, 80, 84, 88, 97, 108, 110, 105, 94, 77, 61, 44]
  }
];

const CORRIDORS = [
  { from: 161, to: 132, label: 'Midtown ↔ JFK Expressway', travelTime: '~35m', distKm: 24.2, speed: 4.2 },
  { from: 161, to: 138, label: 'Midtown ↔ LGA Grand Central Pkwy', travelTime: '~22m', distKm: 14.8, speed: 3.5 },
  { from: 230, to: 161, label: '42nd St Crosstown', travelTime: '~8m', distKm: 1.2, speed: 2.0 },
  { from: 87,  to: 61,  label: 'Brooklyn Bridge Corridor', travelTime: '~12m', distKm: 2.8, speed: 2.4 },
  { from: 148, to: 255, label: 'Williamsburg Bridge', travelTime: '~14m', distKm: 3.4, speed: 2.6 },
  { from: 236, to: 161, label: 'FDR Drive Southbound', travelTime: '~15m', distKm: 4.1, speed: 2.8 },
  { from: 138, to: 132, label: 'Van Wyck Expressway', travelTime: '~20m', distKm: 16.5, speed: 3.8 },
  { from: 239, to: 230, label: 'Broadway / 7th Ave', travelTime: '~10m', distKm: 2.6, speed: 2.2 },
  { from: 79,  to: 87,  label: 'Lafayette / Broadway', travelTime: '~11m', distKm: 2.9, speed: 2.3 }
];

export function MobilityNetworkCanvas({ scenario, activeEvent }) {
  const [selectedZone, setSelectedZone] = useState(TLC_ZONES[0]);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [destZone, setDestZone] = useState(null);
  const [boroughFilter, setBoroughFilter] = useState('ALL');
  const [currentHour, setCurrentHour] = useState(18); // Default 6 PM peak
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const animate = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setAnimProgress((prev) => (prev + delta * 0.4) % 1);
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentHour((prev) => (prev + 1) % 24);
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!scenario || (scenario.modelType !== 'mobility-dispatch' && scenario.modelType !== 'mobility')) return null;

  const params = scenario.parameters || {};
  const results = scenario.results || {};
  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};

  const fleetSize = Number(params.fleetSize || params.numVehicles || 400);
  const dispatchPolicy = params.dispatchPolicy || params.policy || 'NEAREST';

  const tripsCompleted = counters['trips.completed']?.mean || 0;
  const tripsCancelled = counters['trips.cancelled']?.mean || counters['trips.unfulfilled']?.mean || 0;
  const tripsTotal = tripsCompleted + tripsCancelled;
  const cancelRatePct = tripsTotal > 0 ? (tripsCancelled / tripsTotal) * 100 : 0;

  const fleetUtilRaw = timeWeightedMetrics['fleet.utilization']?.mean || 0;
  const fleetUtilPct = fleetUtilRaw * 100;
  const avgWaitSec = sampleMetrics['passenger.wait_time']?.mean || sampleMetrics['trip.waiting_time']?.mean || 0;
  const avgWaitMin = avgWaitSec / 60;

  const activeZoneData = TLC_ZONES.find((z) => z.id === (hoveredZone || selectedZone?.id)) || TLC_ZONES[0];

  const visibleZones = TLC_ZONES.filter((z) => {
    if (boroughFilter === 'ALL') return true;
    return z.borough.toLowerCase() === boroughFilter.toLowerCase();
  });

  const activeRoute = selectedZone && destZone ? {
    origin: selectedZone,
    dest: destZone,
    distKm: (Math.hypot(destZone.x - selectedZone.x, destZone.y - selectedZone.y) * 0.08).toFixed(1),
    estMins: Math.round(Math.hypot(destZone.x - selectedZone.x, destZone.y - selectedZone.y) * 0.12 + 5)
  } : null;

  const isDark = true;

  const colors = {
    bg: '#090d16',
    surface: '#0f172a',
    card: '#1e293b',
    border: '#1e293b',
    borderSubtle: '#334155',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    water: '#07101e',
    waterGradStart: '#060c18',
    waterGradEnd: '#0a1a30',
    landManhattan: '#131d33',
    landOuter: '#0e1626',
    park: '#064e3b',
    parkStroke: '#059669',
    corridorLine: '#334155',
    corridorActive: '#38bdf8',
    haloStroke: '#090d16'
  };

  return (
    <div
      className="panel"
      style={{
        marginBottom: '20px',
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.04)',
        color: colors.textMain,
        transition: 'all 0.2s ease',
        overflow: 'hidden'
      }}
    >
      {/* Top Header & Telemetry Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.border}`,
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
              color: '#38bdf8'
            }}
          >
            <Car size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                NYC TLC Urban Mobility · Digital Twin
              </h3>
              <span className="badge badge-purple font-mono" style={{ fontSize: '10.5px' }}>
                {fleetSize} Cabs ({dispatchPolicy})
              </span>
              <span className="badge badge-blue font-mono" style={{ fontSize: '10.5px' }}>
                TLC Ground-Truth Matrix
              </span>
            </div>
          </div>
        </div>

        {/* Global Model Telemetry Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Fleet Util:</span>
            <strong className="font-mono" style={{ color: fleetUtilPct > 85 ? '#f59e0b' : '#38bdf8' }}>
              {fleetUtilPct.toFixed(1)}%
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Trips Completed:</span>
            <strong className="font-mono">{Math.round(tripsCompleted).toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Cancel Rate:</span>
            <strong className="font-mono" style={{ color: cancelRatePct > 10 ? '#ef4444' : '#10b981' }}>
              {cancelRatePct.toFixed(1)}%
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Avg Wait:</span>
            <strong className="font-mono">{avgWaitMin.toFixed(1)} min</strong>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Layer Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: isDark ? '#0b1120' : '#f8fafc',
          borderBottom: `1px solid ${colors.border}`,
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11.5px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={13} style={{ color: colors.textMuted }} />
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Filter:</span>
          {['ALL', 'Manhattan', 'Brooklyn', 'Queens'].map((b) => (
            <button
              key={b}
              onClick={() => setBoroughFilter(b)}
              style={{
                padding: '3px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: boroughFilter === b ? 700 : 500,
                background: boroughFilter === b ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent',
                color: boroughFilter === b ? '#ffffff' : colors.textMuted,
                border: boroughFilter === b ? 'none' : `1px solid ${colors.borderSubtle}`,
                cursor: 'pointer'
              }}
            >
              {b}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={13} /> Layers:
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: colors.textMain }}>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
            />
            Demand Halos
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: colors.textMain }}>
            <input
              type="checkbox"
              checked={showVehicles}
              onChange={(e) => setShowVehicles(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
            />
            Vehicle Flows
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: colors.textMain }}>
            <input
              type="checkbox"
              checked={showCorridors}
              onChange={(e) => setShowCorridors(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#38bdf8' }}
            />
            Corridors
          </label>
        </div>

        {activeEvent && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
              border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
              color: isDark ? '#38bdf8' : '#0369a1',
              fontFamily: 'monospace',
              fontSize: '10.5px'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
            t = {activeEvent.time.toFixed(1)}s: [{activeEvent.type}]
          </div>
        )}
      </div>

      {/* Main Map & Zone Inspector Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '0px', alignItems: 'stretch' }}>
        {/* Left Column: SVG Map Canvas with Clean Unobstructed View */}
        <div style={{ display: 'flex', flexDirection: 'column', background: colors.water }}>
          <div style={{ position: 'relative', overflow: 'hidden', padding: '16px' }}>
            <svg viewBox="0 0 860 410" style={{ width: '100%', height: 'auto', display: 'block', minHeight: '360px' }}>
              <defs>
                <linearGradient id="waterFlow2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.waterGradStart} />
                  <stop offset="100%" stopColor={colors.waterGradEnd} />
                </linearGradient>

                <radialGradient id="peakDemandGlow2">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="highDemandGlow2">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="65%" stopColor="#0284c7" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="airportGlow2">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#d97706" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Water Basin */}
              <rect width="860" height="410" fill="url(#waterFlow2)" />

              {/* Subtle Grid Coordinates */}
              <g opacity={isDark ? 0.12 : 0.08} stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="0.5">
                {[70, 140, 210, 280, 350].map((y) => (
                  <line key={`gy-${y}`} x1="0" y1={y} x2="860" y2={y} strokeDasharray="3 6" />
                ))}
                {[120, 240, 360, 480, 600, 720].map((x) => (
                  <line key={`gx-${x}`} x1={x} y1="0" x2={x} y2="410" strokeDasharray="3 6" />
                ))}
              </g>

              {/* Hudson River (West Channel) */}
              <path
                d="M 0 0 L 130 0 L 105 180 L 80 270 L 0 320 Z"
                fill={colors.water}
                opacity="0.9"
              />
              <text
                x="35"
                y="150"
                fontSize="9"
                fontWeight="700"
                fill={isDark ? '#38bdf8' : '#0284c7'}
                letterSpacing="3"
                opacity="0.4"
                transform="rotate(-75, 35, 150)"
              >
                HUDSON RIVER
              </text>

              {/* Manhattan Landmass Polygon */}
              <path
                d="M 135 40 L 290 40 L 295 125 L 260 215 L 175 285 L 120 275 L 125 180 L 135 40 Z"
                fill={colors.landManhattan}
                stroke={colors.borderSubtle}
                strokeWidth="1.5"
              />

              {/* Central Park Visual Landmark */}
              <rect
                x="200"
                y="52"
                width="30"
                height="46"
                rx="2"
                fill={colors.park}
                stroke={colors.parkStroke}
                strokeWidth="1"
              />
              <text x="215" y="77" fontSize="7.5" fontWeight="700" fill={isDark ? '#34d399' : '#15803d'} textAnchor="middle" transform="rotate(-90, 215, 77)">
                CENTRAL PARK
              </text>

              {/* East River Channel */}
              <path
                d="M 290 40 C 295 95, 300 145, 260 215 C 220 260, 175 285, 120 390 L 260 390 C 300 310, 330 240, 310 130 C 305 90, 300 45, 290 40 Z"
                fill={colors.water}
                opacity="0.95"
              />
              <text
                x="285"
                y="180"
                fontSize="9"
                fontWeight="700"
                fill={isDark ? '#38bdf8' : '#0284c7'}
                letterSpacing="3"
                opacity="0.4"
                transform="rotate(-70, 285, 180)"
              >
                EAST RIVER
              </text>

              {/* Queens & Brooklyn Landmass */}
              <path
                d="M 305 40 L 850 40 L 850 395 L 250 395 C 300 310, 330 240, 310 130 Z"
                fill={colors.landOuter}
                stroke={colors.borderSubtle}
                strokeWidth="1.2"
              />

              {/* Jamaica Bay Waterway (JFK Lagoon) */}
              <ellipse cx="740" cy="375" rx="70" ry="26" fill={colors.water} opacity="0.95" stroke={colors.borderSubtle} strokeWidth="0.5" />
              <text x="740" y="380" fontSize="8" fontWeight="600" fill={isDark ? '#38bdf8' : '#0284c7'} textAnchor="middle" opacity="0.6">
                JAMAICA BAY · ATLANTIC APPROACH
              </text>

              {/* Flushing Bay (LGA Waterway) */}
              <ellipse cx="520" cy="50" rx="42" ry="20" fill={colors.water} opacity="0.95" stroke={colors.borderSubtle} strokeWidth="0.5" />
              <text x="520" y="54" fontSize="8" fontWeight="600" fill={isDark ? '#38bdf8' : '#0284c7'} textAnchor="middle" opacity="0.6">
                FLUSHING BAY
              </text>

              {/* Major Region Watermark Labels */}
              <text x="145" y="58" fontSize="10" fontWeight="800" fill={colors.textMuted} letterSpacing="2" opacity="0.4">MANHATTAN</text>
              <text x="410" y="65" fontSize="10" fontWeight="800" fill={colors.textMuted} letterSpacing="2" opacity="0.4">QUEENS</text>
              <text x="350" y="365" fontSize="10" fontWeight="800" fill={colors.textMuted} letterSpacing="2" opacity="0.4">BROOKLYN</text>

              {/* Highway Transit Corridors */}
              {showCorridors &&
                CORRIDORS.map((c, i) => {
                  const zFrom = TLC_ZONES.find((z) => z.id === c.from);
                  const zTo = TLC_ZONES.find((z) => z.id === c.to);
                  if (!zFrom || !zTo) return null;

                  const isRouteActive =
                    (selectedZone?.id === c.from && destZone?.id === c.to) ||
                    (selectedZone?.id === c.to && destZone?.id === c.from);
                  const isHighlighted =
                    isRouteActive ||
                    hoveredZone === c.from ||
                    hoveredZone === c.to ||
                    selectedZone?.id === c.from ||
                    selectedZone?.id === c.to;

                  const midX = (zFrom.x + zTo.x) / 2;
                  const midY = (zFrom.y + zTo.y) / 2;

                  return (
                    <g key={i}>
                      <line
                        x1={zFrom.x}
                        y1={zFrom.y}
                        x2={zTo.x}
                        y2={zTo.y}
                        stroke={isRouteActive ? '#f59e0b' : isHighlighted ? colors.corridorActive : colors.corridorLine}
                        strokeWidth={isRouteActive ? 3.5 : isHighlighted ? 2.2 : 1.2}
                        strokeDasharray={isRouteActive ? 'none' : isHighlighted ? 'none' : '4 4'}
                        opacity={isRouteActive ? 1.0 : isHighlighted ? 0.9 : 0.35}
                      />

                      {/* Moving Vehicle Particle */}
                      {showVehicles && (
                        <circle
                          cx={zFrom.x + (zTo.x - zFrom.x) * ((animProgress * c.speed + i * 0.15) % 1)}
                          cy={zFrom.y + (zTo.y - zFrom.y) * ((animProgress * c.speed + i * 0.15) % 1)}
                          r={isRouteActive ? 3.5 : 2.5}
                          fill={isRouteActive ? '#fbbf24' : isDark ? '#38bdf8' : '#0284c7'}
                        />
                      )}

                      {/* Non-overlapping Corridor Travel-Time Pill */}
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-18"
                          y="-7"
                          width="36"
                          height="14"
                          rx="3"
                          fill={isDark ? '#090d16' : '#ffffff'}
                          stroke={isRouteActive ? '#f59e0b' : isHighlighted ? colors.corridorActive : colors.borderSubtle}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3.5"
                          fontSize="8"
                          fontWeight="700"
                          fill={isRouteActive ? '#f59e0b' : isHighlighted ? (isDark ? '#38bdf8' : '#0284c7') : colors.textMuted}
                          textAnchor="middle"
                          className="font-mono"
                        >
                          {c.travelTime}
                        </text>
                      </g>
                    </g>
                  );
                })}

              {/* Active Route Curve */}
              {activeRoute && (
                <path
                  d={`M ${selectedZone.x} ${selectedZone.y} Q ${(selectedZone.x + destZone.x) / 2} ${Math.min(selectedZone.y, destZone.y) - 35} ${destZone.x} ${destZone.y}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="6 3"
                />
              )}

              {/* TLC Taxi Zone Nodes */}
              {visibleZones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                const isDest = destZone?.id === zone.id;
                const isHovered = hoveredZone === zone.id;
                const isAirport = zone.id === 132 || zone.id === 138;
                const isCore = zone.id === 230 || zone.id === 161;

                const currentDemandRate = zone.hourlyProfile[currentHour] || zone.peakTripsHr;
                const peakRate = Math.max(...zone.hourlyProfile);
                const demandIntensity = currentDemandRate / peakRate;
                const haloRadius = 14 + demandIntensity * 16;

                return (
                  <g
                    key={zone.id}
                    onClick={() => {
                      if (!selectedZone) {
                        setSelectedZone(zone);
                      } else if (!destZone && zone.id !== selectedZone.id) {
                        setDestZone(zone);
                      } else {
                        setSelectedZone(zone);
                        setDestZone(null);
                      }
                    }}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Demand Heat Halo */}
                    {showHeatmap && (
                      <circle
                        cx={zone.x}
                        cy={zone.y}
                        r={isSelected || isHovered ? haloRadius + 6 : haloRadius}
                        fill={isAirport ? 'url(#airportGlow2)' : demandIntensity > 0.8 ? 'url(#peakDemandGlow2)' : 'url(#highDemandGlow2)'}
                        opacity={isSelected || isHovered ? 0.9 : 0.45 + demandIntensity * 0.4}
                        style={{ transition: 'r 0.5s ease, opacity 0.5s ease' }}
                      />
                    )}

                    {/* Outer Boundary Ring */}
                    <circle
                      cx={zone.x}
                      cy={zone.y}
                      r={isAirport ? 14 : 10}
                      fill={isDark ? '#0f172a' : '#ffffff'}
                      stroke={
                        isDest
                          ? '#f59e0b'
                          : isSelected
                          ? '#38bdf8'
                          : isAirport
                          ? '#d97706'
                          : isCore
                          ? isDark ? '#ffffff' : '#0f172a'
                          : colors.borderSubtle
                      }
                      strokeWidth={isSelected || isDest || isHovered ? 2.5 : 1.8}
                    />

                    {/* Node Core Center Dot */}
                    <circle
                      cx={zone.x}
                      cy={zone.y}
                      r={isAirport ? 5 : 3.5}
                      fill={
                        isDest
                          ? '#f59e0b'
                          : isSelected
                          ? '#38bdf8'
                          : isAirport
                          ? '#d97706'
                          : demandIntensity > 0.75
                          ? '#ef4444'
                          : '#3b82f6'
                      }
                    />

                    {/* Highly-Legible Haloed Label Placement with Hand-Crafted Offsets */}
                    <g transform={`translate(${zone.x + zone.labelPos.dx}, ${zone.y + zone.labelPos.dy})`}>
                      <text
                        x="0"
                        y="0"
                        fontSize="10"
                        fontWeight={isSelected || isDest ? 800 : isHovered ? 700 : 600}
                        fill={isDest ? '#f59e0b' : isSelected ? '#38bdf8' : colors.textMain}
                        textAnchor={zone.labelPos.anchor}
                        style={{
                          paintOrder: 'stroke fill',
                          stroke: colors.haloStroke,
                          strokeWidth: '4px',
                          strokeLinejoin: 'round'
                        }}
                      >
                        {zone.shortName}
                      </text>
                      <text
                        x="0"
                        y="10.5"
                        fontSize="7.5"
                        fill={colors.textMuted}
                        textAnchor={zone.labelPos.anchor}
                        style={{
                          paintOrder: 'stroke fill',
                          stroke: colors.haloStroke,
                          strokeWidth: '3px',
                          strokeLinejoin: 'round'
                        }}
                        className="font-mono"
                      >
                        #{zone.id} · {currentDemandRate} trips/h
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Dedicated Diurnal Time Controller Bar (Docked under map, not covering it!) */}
          <div
            style={{
              padding: '10px 16px',
              background: isDark ? '#0b1120' : '#f8fafc',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isDark ? '#38bdf8' : '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={isPlaying ? 'Pause Diurnal Clock' : 'Play 24h Cycle'}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentHour(18);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Reset to 18:00 Peak"
              >
                <RotateCcw size={13} />
              </button>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span style={{ fontSize: '11px', color: colors.textMuted }}>Diurnal Clock:</span>
                <strong className="font-mono" style={{ fontSize: '13px', color: isDark ? '#38bdf8' : '#0284c7' }}>
                  {String(currentHour).padStart(2, '0')}:00
                </strong>
                <span style={{ fontSize: '10.5px', color: colors.textMuted }}>
                  ({currentHour >= 7 && currentHour <= 10 ? 'AM Rush' : currentHour >= 17 && currentHour <= 20 ? 'PM Peak' : currentHour >= 22 || currentHour <= 5 ? 'Night' : 'Day'})
                </span>
              </div>
            </div>

            {/* Slider */}
            <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: colors.textMuted }} className="font-mono">00h</span>
              <input
                type="range"
                min="0"
                max="23"
                value={currentHour}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentHour(Number(e.target.value));
                }}
                style={{
                  flex: 1,
                  accentColor: isDark ? '#38bdf8' : '#0284c7',
                  cursor: 'pointer',
                  height: '4px'
                }}
              />
              <span style={{ fontSize: '10px', color: colors.textMuted }} className="font-mono">23h</span>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px' }}>
              <button
                onClick={() => setCurrentHour(8)}
                style={{
                  padding: '2px 7px',
                  borderRadius: '3px',
                  background: currentHour === 8 ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent',
                  color: currentHour === 8 ? '#ffffff' : colors.textMuted,
                  border: `1px solid ${colors.borderSubtle}`,
                  cursor: 'pointer'
                }}
              >
                08h AM
              </button>
              <button
                onClick={() => setCurrentHour(18)}
                style={{
                  padding: '2px 7px',
                  borderRadius: '3px',
                  background: currentHour === 18 ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent',
                  color: currentHour === 18 ? '#ffffff' : colors.textMuted,
                  border: `1px solid ${colors.borderSubtle}`,
                  cursor: 'pointer'
                }}
              >
                18h PM
              </button>
              <button
                onClick={() => setCurrentHour(23)}
                style={{
                  padding: '2px 7px',
                  borderRadius: '3px',
                  background: currentHour === 23 ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent',
                  color: currentHour === 23 ? '#ffffff' : colors.textMuted,
                  border: `1px solid ${colors.borderSubtle}`,
                  cursor: 'pointer'
                }}
              >
                23h Late
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Zone & OD Flow Inspector */}
        <div
          style={{
            background: colors.card,
            borderLeft: `1px solid ${colors.border}`,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                borderBottom: `1px solid ${colors.border}`,
                paddingBottom: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Compass size={14} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>
                  Zone & Flow Inspector
                </h4>
              </div>
              <span className="badge badge-gray font-mono" style={{ fontSize: '10px' }}>
                ID #{activeZoneData.id}
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>
                {activeZoneData.name}
              </div>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
                {activeZoneData.borough} · {activeZoneData.areaType}
              </div>
              <div className="font-mono" style={{ fontSize: '10px', color: colors.textMuted, marginTop: '2px' }}>
                {activeZoneData.lat.toFixed(4)}° N, {Math.abs(activeZoneData.lon).toFixed(4)}° W
              </div>
            </div>

            <div
              style={{
                background: isDark ? '#0b1120' : '#ffffff',
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: colors.textMuted }}>Demand at {currentHour}:00:</span>
                <span className="font-mono" style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>
                  ~{activeZoneData.hourlyProfile[currentHour]} <span style={{ fontSize: '10px', fontWeight: 500, color: colors.textMuted }}>trips/hr</span>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: colors.textMuted }}>
                <span>Peak Historical:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{activeZoneData.peakTripsHr} trips/hr</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: colors.textMuted, marginBottom: '4px' }}>
                <span>24h Diurnal Profile:</span>
                <span className="font-mono" style={{ fontSize: '9.5px' }}>Hour: {currentHour}h</span>
              </div>
              <div
                style={{
                  height: '40px',
                  background: isDark ? '#0b1120' : '#ffffff',
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: '4px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '2px'
                }}
              >
                {activeZoneData.hourlyProfile.map((rate, h) => {
                  const maxRate = Math.max(...activeZoneData.hourlyProfile);
                  const barHeight = Math.max(4, Math.round((rate / maxRate) * 32));
                  const isCurrent = h === currentHour;
                  const isPeakHour = h >= 17 && h <= 19;
                  return (
                    <div
                      key={h}
                      onClick={() => setCurrentHour(h)}
                      title={`Hour ${h}:00 - ~${rate} trips/hr`}
                      style={{
                        flex: 1,
                        height: `${barHeight}px`,
                        background: isCurrent ? '#f59e0b' : isPeakHour ? '#ef4444' : isDark ? '#38bdf8' : '#0284c7',
                        borderRadius: '1px 1px 0 0',
                        opacity: isCurrent ? 1.0 : 0.65,
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, marginBottom: '8px' }}>
                Top Destination Flows (Gravity Model):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeZoneData.topDestinations.map((dest, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const target = TLC_ZONES.find((z) => z.id === dest.id);
                      if (target) setDestZone(target);
                    }}
                    style={{
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: destZone?.id === dest.id ? (isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7') : (isDark ? '#0b1120' : '#ffffff'),
                      border: destZone?.id === dest.id ? '1px solid #f59e0b' : `1px solid ${colors.borderSubtle}`,
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ color: colors.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px' }}>
                      → {dest.name}
                    </span>
                    <span className="font-mono" style={{ fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>
                      {dest.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {activeRoute && (
              <div
                style={{
                  background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '11px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Navigation size={12} /> Selected Route
                  </strong>
                  <button
                    onClick={() => setDestZone(null)}
                    style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '10px' }}
                  >
                    Clear
                  </button>
                </div>
                <div style={{ color: colors.textMain, marginBottom: '6px', fontWeight: 600 }}>
                  {activeRoute.origin.shortName} → {activeRoute.dest.shortName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                  <span>Distance: <strong className="font-mono" style={{ color: colors.textMain }}>{activeRoute.distKm} km</strong></span>
                  <span>Est. Trip: <strong className="font-mono" style={{ color: colors.textMain }}>~{activeRoute.estMins} mins</strong></span>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              paddingTop: '8px',
              borderTop: `1px solid ${colors.border}`,
              fontSize: '10px',
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Info size={11} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
            <span>Calibrated against NYC TLC Yellow Taxi trip data.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
