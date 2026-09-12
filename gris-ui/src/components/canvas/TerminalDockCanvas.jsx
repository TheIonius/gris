import React, { useState, useEffect } from 'react';
import {
  Anchor,
  Info,
  Ship,
  Sliders
} from 'lucide-react';

const SAMPLE_VESSELS = [
  { id: 'v-1', name: 'MSC Caucedo Express', shortName: 'MSC Caucedo', vesselClass: 'POST-PANAMAX', moves: 1200, lengthM: 366, draftM: 15.2, flag: 'Panama' },
  { id: 'v-2', name: 'Maersk Caribbean Star', shortName: 'Maersk Caribbean', vesselClass: 'PANAMAX', moves: 650, lengthM: 294, draftM: 12.5, flag: 'Denmark' },
  { id: 'v-3', name: 'CMA CGM Santo Domingo', shortName: 'CMA CGM Domingo', vesselClass: 'FEEDER', moves: 250, lengthM: 170, draftM: 8.8, flag: 'France' },
  { id: 'v-4', name: 'Hapag-Lloyd Quisqueya', shortName: 'Hapag Quisqueya', vesselClass: 'PANAMAX', moves: 720, lengthM: 280, draftM: 12.0, flag: 'Germany' }
];

export function TerminalDockCanvas({ scenario, activeEvent }) {
  const [selectedBerthIdx, setSelectedBerthIdx] = useState(0);
  const [cranePolicyOverride, setCranePolicyOverride] = useState(null);
  const [animTick, setAnimTick] = useState(0);
  const [isCranesActive, setIsCranesActive] = useState(true);

  useEffect(() => {
    let animId;
    let last = performance.now();

    const loop = (t) => {
      const delta = (t - last) / 1000;
      last = t;
      setAnimTick((prev) => (prev + delta * 0.5) % 1);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (!scenario || scenario.modelType !== 'caucedo-terminal') return null;

  const params = scenario.parameters || {};
  const results = scenario.results || {};
  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};

  const berthsCount = Number(params.berths || 3);
  const cranesCount = Number(params.quayCranes || 8);
  const activeCranePolicy = cranePolicyOverride || params.cranePolicy || 'DYNAMIC';
  const gmph = Number(params.movesPerHourPerCrane || 28.0);

  const vesselsServed = counters['vessels.served']?.mean || 0;
  const containersMoved = counters['containers.moved']?.mean || 0;
  const turnaroundHours = sampleMetrics['vessel.turnaround_time_hours']?.mean ?? sampleMetrics['vessel.turnaround_hours']?.mean ?? 0;
  const rawWaitSeconds = sampleMetrics['vessel.berth_wait_time']?.mean ?? sampleMetrics['terminal.berths.wait_time']?.mean;
  const waitingHours = sampleMetrics['vessel.waiting_hours']?.mean ?? (rawWaitSeconds !== undefined ? rawWaitSeconds / 3600 : 0);
  const berthUtil = ((timeWeightedMetrics['terminal.berths.utilization']?.mean ?? timeWeightedMetrics['berth.utilization']?.mean ?? 0)) * 100;
  const craneUtil = ((timeWeightedMetrics['terminal.quay_cranes.utilization']?.mean ?? timeWeightedMetrics['crane.utilization']?.mean ?? 0)) * 100;

  const berthCranesAllocated = Array.from({ length: berthsCount }).map((_, idx) => {
    const vessel = SAMPLE_VESSELS[idx % SAMPLE_VESSELS.length];
    if (activeCranePolicy === 'DYNAMIC') {
      if (vessel.vesselClass === 'POST-PANAMAX') return Math.min(4, Math.max(2, Math.floor(cranesCount / berthsCount) + 1));
      if (vessel.vesselClass === 'PANAMAX') return Math.min(3, Math.max(2, Math.floor(cranesCount / berthsCount)));
      return Math.min(2, Math.max(1, Math.floor(cranesCount / berthsCount)));
    }
    return Math.max(1, Math.floor(cranesCount / berthsCount));
  });

  const nominalDailyCapacity = Math.round(cranesCount * gmph * 24);
  const selectedVessel = SAMPLE_VESSELS[selectedBerthIdx % SAMPLE_VESSELS.length];
  const isDark = true;

  const colors = {
    bg: '#090d16',
    surface: '#0f172a',
    card: '#1e293b',
    border: '#1e293b',
    borderSubtle: '#334155',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    waterGradStart: '#081220',
    waterGradEnd: '#0f243e',
    quayGradStart: '#1e293b',
    quayGradEnd: '#0f172a',
    hullGradStart: '#334155',
    hullGradEnd: '#1e293b',
    railTrack: '#475569',
    craneBody: '#38bdf8',
    craneBoom: '#0284c7'
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
      {/* Header Bar */}
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
              background: isDark ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe',
              color: '#0284c7'
            }}
          >
            <Anchor size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                DP World Caucedo Terminal · Digital Twin
              </h3>
              <span className="badge badge-blue font-mono" style={{ fontSize: '10.5px' }}>
                {berthsCount} Berths · {cranesCount} STS Cranes
              </span>
              <span className="badge badge-neutral font-mono" style={{ fontSize: '10.5px' }}>
                Policy: {activeCranePolicy}
              </span>
            </div>
          </div>
        </div>

        {/* Global Port Telemetry Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Vessels Served:</span>
            <strong className="font-mono">{Math.round(vesselsServed)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Containers Handled:</span>
            <strong className="font-mono">{Math.round(containersMoved).toLocaleString()} TEU</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Avg Turnaround:</span>
            <strong className="font-mono" style={{ color: turnaroundHours > 12 ? '#f59e0b' : '#10b981' }}>
              {turnaroundHours.toFixed(1)}h
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Anchorage Wait:</span>
            <strong className="font-mono">{waitingHours.toFixed(1)}h</strong>
          </div>
        </div>
      </div>

      {/* Sub-bar: Policy Knobs & Active Replay Event */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sliders size={13} /> Crane Allocation Strategy:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setCranePolicyOverride('DYNAMIC')}
              style={{
                padding: '3px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: activeCranePolicy === 'DYNAMIC' ? 700 : 500,
                background: activeCranePolicy === 'DYNAMIC' ? '#0284c7' : 'transparent',
                color: activeCranePolicy === 'DYNAMIC' ? '#ffffff' : colors.textMuted,
                border: activeCranePolicy === 'DYNAMIC' ? 'none' : `1px solid ${colors.borderSubtle}`,
                cursor: 'pointer'
              }}
            >
              DYNAMIC (2–4 size-adaptive)
            </button>
            <button
              onClick={() => setCranePolicyOverride('STATIC')}
              style={{
                padding: '3px 9px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: activeCranePolicy === 'STATIC' ? 700 : 500,
                background: activeCranePolicy === 'STATIC' ? '#0284c7' : 'transparent',
                color: activeCranePolicy === 'STATIC' ? '#ffffff' : colors.textMuted,
                border: activeCranePolicy === 'STATIC' ? 'none' : `1px solid ${colors.borderSubtle}`,
                cursor: 'pointer'
              }}
            >
              STATIC (Fixed 2 per vessel)
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginLeft: '10px', color: colors.textMain }}>
            <input
              type="checkbox"
              checked={isCranesActive}
              onChange={(e) => setIsCranesActive(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#0284c7' }}
            />
            Simulate Hoist Animation
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
              background: isDark ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe',
              border: `1px solid ${isDark ? 'rgba(2, 132, 199, 0.3)' : '#bae6fd'}`,
              color: isDark ? '#38bdf8' : '#0369a1',
              fontFamily: 'monospace',
              fontSize: '10.5px'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7', animation: 'pulse 1.5s infinite' }} />
            t = {activeEvent.time.toFixed(1)}s: [{activeEvent.type}]
          </div>
        )}
      </div>

      {/* Main Schematic & Operations Inspector Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '0px', alignItems: 'stretch' }}>
        {/* SVG Harbor Schematic */}
        <div style={{ background: isDark ? '#050b14' : '#f0f9ff', padding: '16px', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 840 260" style={{ width: '100%', height: 'auto', display: 'block', minHeight: '320px' }}>
            <defs>
              <linearGradient id="waterCurrents2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.waterGradStart} />
                <stop offset="100%" stopColor={colors.waterGradEnd} />
              </linearGradient>

              <linearGradient id="quayPavement2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.quayGradStart} />
                <stop offset="100%" stopColor={colors.quayGradEnd} />
              </linearGradient>

              <linearGradient id="shipHullGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.hullGradStart} />
                <stop offset="100%" stopColor={colors.hullGradEnd} />
              </linearGradient>
            </defs>

            {/* Basin Waterway */}
            <rect x="0" y="0" width="840" height="135" fill="url(#waterCurrents2)" />

            {/* Animated Water Current Ripple Lines */}
            {[25, 55, 85, 115].map((y, idx) => (
              <line
                key={`water-${idx}`}
                x1="-50"
                y1={y}
                x2="890"
                y2={y}
                stroke={isDark ? '#38bdf8' : '#0284c7'}
                strokeWidth="0.5"
                strokeDasharray="12 24"
                strokeDashoffset={animTick * -100 * (idx + 1)}
                opacity={isDark ? 0.15 : 0.25}
              />
            ))}

            {/* Anchorage Basin (Queue) Card */}
            <g transform="translate(15, 12)">
              <rect
                x="0"
                y="0"
                width="190"
                height="46"
                rx="4"
                fill={isDark ? '#0f172a' : '#ffffff'}
                stroke={colors.borderSubtle}
                strokeDasharray="3 3"
                opacity="0.95"
              />
              <text x="12" y="16" fontSize="9.5" fontWeight="700" fill={colors.textMain}>
                ANCHORAGE ROADSTEAD
              </text>
              <text x="12" y="28" fontSize="8.5" fill={colors.textMuted}>
                Vessel Waiting Queue
              </text>

              <g transform="translate(12, 33)">
                <circle cx="5" cy="4" r="3" fill="#f59e0b" />
                <text x="14" y="7" fontSize="8" fill={colors.textMuted} className="font-mono">
                  {Math.max(0, Math.round(waitingHours * 0.4))} Vessels in queue
                </text>
              </g>

              {/* Navigation Channel Buoy */}
              <circle cx="174" cy="23" r="4" fill="#10b981" />
              <circle cx="174" cy="23" r="8" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.6" />
            </g>

            {/* Quay Wall Apron */}
            <rect x="0" y="135" width="840" height="125" fill="url(#quayPavement2)" stroke={colors.borderSubtle} strokeWidth="1" />

            {/* Yellow Striped Quay Border */}
            <line x1="0" y1="136" x2="840" y2="136" stroke="#eab308" strokeWidth="2.5" strokeDasharray="8 6" />

            {/* Dual Rail Tracks */}
            <line x1="10" y1="145" x2="830" y2="145" stroke={colors.railTrack} strokeWidth="2" strokeDasharray="6 4" />
            <line x1="10" y1="185" x2="830" y2="185" stroke={colors.railTrack} strokeWidth="2" strokeDasharray="6 4" />

            {/* Terminal Tractor Shuttle Lane */}
            <line x1="10" y1="225" x2="830" y2="225" stroke={colors.borderSubtle} strokeWidth="1" strokeDasharray="4 4" />
            <text x="20" y="246" fontSize="8" fill={colors.textMuted} fontWeight="600">
              TERMINAL TRACTOR (HAULER) APRON TRANSFER LANE
            </text>

            {/* Moving Terminal Yard Hauler */}
            <g transform={`translate(${((animTick * 600) % 760) + 30}, 218)`}>
              <rect width="26" height="11" rx="2" fill="#0284c7" />
              <rect x="20" y="2" width="5" height="7" rx="1" fill="#f8fafc" />
              <rect x="2" y="-5" width="18" height="6" rx="1" fill="#f59e0b" />
            </g>

            {/* Render Berths & Vessels */}
            {Array.from({ length: berthsCount }).map((_, idx) => {
              const berthWidth = (840 - 40) / berthsCount;
              const startX = 20 + idx * berthWidth;
              const vessel = SAMPLE_VESSELS[idx % SAMPLE_VESSELS.length];
              const isSelected = selectedBerthIdx === idx;
              const cranesForThisBerth = berthCranesAllocated[idx] || 2;

              const shipLength = berthWidth * (vessel.vesselClass === 'POST-PANAMAX' ? 0.84 : vessel.vesselClass === 'PANAMAX' ? 0.72 : 0.60);
              const shipX = startX + (berthWidth - shipLength) / 2;
              const dischargePct = Math.min(100, Math.round(((idx + 1) * 33 + animTick * 15) % 100));

              return (
                <g
                  key={idx}
                  onClick={() => setSelectedBerthIdx(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Berth Separator Line */}
                  <line x1={startX} y1="120" x2={startX} y2="255" stroke={colors.borderSubtle} strokeWidth="1" strokeDasharray="3 3" />

                  {/* Clean Berth Badge Above Dock */}
                  <g transform={`translate(${startX + 8}, 138)`}>
                    <rect
                      x="0"
                      y="0"
                      width="100"
                      height="17"
                      rx="3"
                      fill={isSelected ? '#0284c7' : isDark ? '#1e293b' : '#ffffff'}
                      stroke={isSelected ? '#38bdf8' : colors.borderSubtle}
                      strokeWidth="1"
                    />
                    <text
                      x="50"
                      y="11.5"
                      fontSize="9"
                      fontWeight="700"
                      fill={isSelected ? '#ffffff' : colors.textMain}
                      textAnchor="middle"
                    >
                      BERTH {idx + 1} {isSelected ? '● SELECTED' : ''}
                    </text>
                  </g>

                  {/* Moored Ship Vessel */}
                  <g>
                    {/* Ship Hull */}
                    <path
                      d={`M ${shipX} 118 L ${shipX + 16} 84 L ${shipX + shipLength - 16} 84 L ${shipX + shipLength} 118 Z`}
                      fill="url(#shipHullGrad2)"
                      stroke={isSelected ? '#38bdf8' : isDark ? '#475569' : '#1e293b'}
                      strokeWidth={isSelected ? 2 : 1}
                    />

                    {/* Container Stacks on Ship Deck */}
                    <g transform={`translate(${shipX + 22}, 54)`}>
                      <rect x="0"  y="16" width="18" height="13" fill="#0284c7" rx="1" />
                      <rect x="22" y="16" width="18" height="13" fill="#0d9488" rx="1" />
                      <rect x="44" y="16" width="18" height="13" fill="#b45309" rx="1" />
                      <rect x="66" y="16" width="18" height="13" fill="#64748b" rx="1" />
                      {shipLength > 150 && (
                        <>
                          <rect x="88"  y="16" width="18" height="13" fill="#0369a1" rx="1" />
                          <rect x="110" y="16" width="18" height="13" fill="#e11d48" rx="1" />
                        </>
                      )}
                      {/* Top tier containers */}
                      <rect x="11" y="2" width="18" height="12" fill="#7c3aed" rx="1" />
                      <rect x="33" y="2" width="18" height="12" fill="#d97706" rx="1" />
                    </g>

                    {/* Clear, Non-colliding Vessel Class Text on Hull */}
                    <text
                      x={shipX + shipLength / 2}
                      y="102"
                      fontSize="9"
                      fontWeight="800"
                      fill="#ffffff"
                      textAnchor="middle"
                      letterSpacing="0.8"
                    >
                      {vessel.vesselClass}
                    </text>
                    <text
                      x={shipX + shipLength / 2}
                      y="113"
                      fontSize="8"
                      fill={isDark ? '#94a3b8' : '#cbd5e1'}
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {dischargePct}% Discharged
                    </text>

                    {/* Mini progress bar under hull */}
                    <rect x={shipX + 24} y="122" width={shipLength - 48} height="3" rx="1.5" fill={isDark ? '#1e293b' : '#cbd5e1'} />
                    <rect x={shipX + 24} y="122" width={(shipLength - 48) * (dischargePct / 100)} height="3" rx="1.5" fill="#10b981" />
                  </g>

                  {/* Allocated STS Quay Cranes */}
                  {Array.from({ length: cranesForThisBerth }).map((_, cIdx) => {
                    const craneSpacing = Math.min(46, (shipLength - 30) / cranesForThisBerth);
                    const craneX = shipX + 20 + cIdx * craneSpacing;

                    const trolleyOffset = isCranesActive
                      ? Math.sin((animTick * Math.PI * 2) + cIdx * 1.2) * 15
                      : 0;

                    return (
                      <g key={`crane-${idx}-${cIdx}`}>
                        {/* Crane Base */}
                        <rect x={craneX - 6} y="142" width="12" height="42" fill={isDark ? '#334155' : '#475569'} rx="2" />

                        {/* Crane Pylon Tower */}
                        <line x1={craneX} y1="142" x2={craneX} y2="40" stroke={colors.craneBody} strokeWidth="3" />

                        {/* Boom Arm */}
                        <line x1={craneX - 32} y1="42" x2={craneX + 16} y2="42" stroke={colors.craneBoom} strokeWidth="2.5" />

                        {/* Hoist Trolley */}
                        <g transform={`translate(${craneX - 9 + trolleyOffset}, 38)`}>
                          <rect width="9" height="7" rx="1" fill="#e11d48" />
                          <line x1="2" y1="7" x2="2" y2="24" stroke="#64748b" strokeWidth="1" strokeDasharray="2 1" />
                          <line x1="7" y1="7" x2="7" y2="24" stroke="#64748b" strokeWidth="1" strokeDasharray="2 1" />
                          <rect x="-1" y="24" width="11" height="7" rx="1" fill="#f59e0b" />
                        </g>

                        {/* Clean Crane Badge between rail lines */}
                        <circle cx={craneX} cy="165" r="7" fill={isSelected ? '#0284c7' : '#0f172a'} stroke="#ffffff" strokeWidth="1" />
                        <text x={craneX} y="168" fontSize="7.5" fontWeight="800" fill="#ffffff" textAnchor="middle">
                          C{idx * 2 + cIdx + 1}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Side: Port Logistics Inspector */}
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
                <Ship size={14} style={{ color: '#0284c7' }} />
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>
                  Berth #{selectedBerthIdx + 1} Inspector
                </h4>
              </div>
              <span className="badge badge-blue font-mono" style={{ fontSize: '10px' }}>
                MOORED
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>
                {selectedVessel.name}
              </div>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
                Class: <strong style={{ color: colors.textMain }}>{selectedVessel.vesselClass}</strong> · Flag: {selectedVessel.flag}
              </div>
              <div className="font-mono" style={{ fontSize: '10px', color: colors.textMuted, marginTop: '2px' }}>
                LOA: {selectedVessel.lengthM}m · Max Draft: {selectedVessel.draftM}m
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: colors.textMuted }}>Allocated Cranes:</span>
                <strong className="font-mono" style={{ color: '#0284c7' }}>
                  {berthCranesAllocated[selectedBerthIdx]} STS Cranes
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                <span style={{ color: colors.textMuted }}>Handling Speed:</span>
                <strong className="font-mono">
                  {(berthCranesAllocated[selectedBerthIdx] * gmph).toFixed(0)} moves/hr
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: colors.textMuted }}>Est. Turnaround:</span>
                <strong className="font-mono">
                  {(selectedVessel.moves / (berthCranesAllocated[selectedBerthIdx] * gmph)).toFixed(1)} hrs
                </strong>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                <span style={{ color: colors.textMuted }}>Berth Utilization:</span>
                <strong className="font-mono" style={{ color: berthUtil > 82 ? '#ef4444' : '#10b981' }}>
                  {berthUtil.toFixed(1)}%
                </strong>
              </div>
              <div style={{ height: '6px', background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, berthUtil))}%`, background: berthUtil > 82 ? '#ef4444' : '#10b981', transition: 'width 0.5s ease' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                <span style={{ color: colors.textMuted }}>STS Crane Utilization:</span>
                <strong className="font-mono" style={{ color: craneUtil > 85 ? '#ef4444' : '#0284c7' }}>
                  {craneUtil.toFixed(1)}%
                </strong>
              </div>
              <div style={{ height: '6px', background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, craneUtil))}%`, background: craneUtil > 85 ? '#f59e0b' : '#0284c7', transition: 'width 0.5s ease' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', borderTop: `1px solid ${colors.border}`, paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textMuted }}>Gross Crane Productivity:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{gmph} GMPH</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textMuted }}>Crane Density:</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>{(cranesCount / berthsCount).toFixed(1)} cranes / berth</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textMuted }}>Nominal Daily Capacity:</span>
                <span className="font-mono" style={{ fontWeight: 600, color: '#0284c7' }}>~{nominalDailyCapacity.toLocaleString()} TEU/day</span>
              </div>
            </div>
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
            <Info size={11} style={{ color: '#0284c7' }} />
            <span>DP World Caucedo deep-water container terminal digital twin.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
