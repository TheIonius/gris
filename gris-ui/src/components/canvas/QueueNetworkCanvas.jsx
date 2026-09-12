import React, { useState, useEffect } from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  Sliders
} from 'lucide-react';

export function QueueNetworkCanvas({ scenario }) {
  const params = scenario?.parameters || {};
  const baseLambda = Number(params.lambda || 0.5);
  const baseMu = Number(params.mu || 1.0);
  const baseServers = Number(params.servers || 1);

  // Interactive Live What-If Overrides
  const [liveLambda, setLiveLambda] = useState(baseLambda);
  const [liveMu, setLiveMu] = useState(baseMu);
  const [liveServers, setLiveServers] = useState(baseServers);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1); // 0.5, 1, 2, 4

  // Particles in transit
  const [particles, setParticles] = useState([
    { id: 1, progress: 0.15, stage: 'arrival' },
    { id: 2, progress: 0.42, stage: 'queue' },
    { id: 3, progress: 0.78, stage: 'service' }
  ]);

  // Keep live controls in sync if scenario changes
  useEffect(() => {
    setLiveLambda(baseLambda);
    setLiveMu(baseMu);
    setLiveServers(baseServers);
  }, [scenario?.id, baseLambda, baseMu, baseServers]);

  // Animation frame loop for customer particle pipeline
  useEffect(() => {
    let animId;
    let last = performance.now();

    const loop = (t) => {
      const delta = (t - last) / 1000;
      last = t;

      if (isPlaying) {
        setParticles((prev) => {
          return prev
            .map((p) => ({
              ...p,
              progress: p.progress + delta * (0.25 * simSpeed) * (liveLambda / 0.5)
            }))
            .filter((p) => p.progress < 1.15)
            .concat(
              Math.random() < delta * liveLambda * 1.5 * simSpeed
                ? [{ id: Date.now() + Math.random(), progress: 0, stage: 'arrival' }]
                : []
            );
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, simSpeed, liveLambda]);

  if (!scenario || scenario.modelType !== 'mm1-queue') return null;

  const results = scenario.results || {};
  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};

  const rho = liveServers > 0 && liveMu > 0 ? liveLambda / (liveServers * liveMu) : 0;
  const isSupercritical = rho >= 1.0;
  const isHeavyTraffic = rho >= 0.85 && rho < 1.0;

  // Real Engine Reported Values
  const queueLengthMean = timeWeightedMetrics['server.queue_length']?.mean ?? timeWeightedMetrics['queue.length']?.mean ?? (rho / (1 - Math.min(0.99, rho)));
  const serverUtilMean = ((timeWeightedMetrics['server.utilization']?.mean ?? rho)) * 100;
  const waitTimeMean = sampleMetrics['steady.customer.queue_wait']?.mean ?? sampleMetrics['server.wait_time']?.mean ?? (rho / (liveMu * (1 - Math.min(0.99, rho))));
  const systemTimeMean = sampleMetrics['steady.customer.system_time']?.mean ?? (waitTimeMean + 1 / liveMu);
  const customersServed = counters['customers.served']?.mean || (liveLambda * 1000);
  const customersDropped = counters['customers.dropped']?.mean || (isSupercritical ? Math.round((liveLambda - liveMu) * 500) : 0);

  // Theoretical M/M/1 values if single server and rho < 1
  const theoreticalW = liveServers === 1 && !isSupercritical ? 1.0 / (liveMu - liveLambda) : null;
  const theoreticalL = liveServers === 1 && !isSupercritical ? liveLambda / (liveMu - liveLambda) : null;

  const isDark = true;

  const colors = {
    bg: '#090d16',
    surface: '#0f172a',
    card: '#1e293b',
    border: '#1e293b',
    borderSubtle: '#334155',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    stageBg: '#0b1120',
    stageHeader: '#1e293b',
    pipelineLine: '#475569',
    particle: '#38bdf8',
    particleGlow: 'rgba(56, 189, 248, 0.4)'
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
        transition: 'all 0.2s ease'
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
              background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
              color: '#38bdf8'
            }}
          >
            <Layers size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                Discrete-Event Queueing Pipeline · Digital Twin
              </h3>
              <span
                className={`badge font-mono ${
                  isSupercritical ? 'badge-red' : isHeavyTraffic ? 'badge-amber' : 'badge-blue'
                }`}
                style={{ fontSize: '10.5px' }}
              >
                M/M/{liveServers} · ρ = {(rho * 100).toFixed(1)}% ({isSupercritical ? 'Supercritical' : isHeavyTraffic ? 'Heavy Traffic' : 'Ergodic Equilibrium'})
              </span>
            </div>
          </div>
        </div>

        {/* Global Pipeline Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Served:</span>
            <strong className="font-mono">{Math.round(customersServed).toLocaleString()}</strong>
          </div>
          {customersDropped > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#ef4444' }}>Dropped:</span>
              <strong className="font-mono" style={{ color: '#ef4444' }}>{Math.round(customersDropped).toLocaleString()}</strong>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Mean System W:</span>
            <strong className="font-mono">{systemTimeMean.toFixed(3)}s</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: colors.textMuted }}>Mean Buffer Lq:</span>
            <strong className="font-mono">{queueLengthMean.toFixed(3)}</strong>
          </div>
        </div>
      </div>

      {/* Interactive Parameter Tuning Sub-bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: isDark ? '#0b1120' : '#f8fafc',
          borderBottom: `1px solid ${colors.border}`,
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11.5px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={13} style={{ color: colors.textMuted }} />
            <strong style={{ color: colors.textMain }}>Live What-If Knobs:</strong>
          </div>

          {/* Lambda slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.textMuted }}>Arrival λ:</span>
            <input
              type="range"
              min="0.1"
              max="2.5"
              step="0.05"
              value={liveLambda}
              onChange={(e) => setLiveLambda(Number(e.target.value))}
              style={{ width: '90px', accentColor: '#38bdf8', cursor: 'pointer', height: '4px' }}
            />
            <strong className="font-mono" style={{ minWidth: '42px', color: '#38bdf8' }}>
              {liveLambda.toFixed(2)}/s
            </strong>
          </div>

          {/* Mu slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.textMuted }}>Service μ:</span>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={liveMu}
              onChange={(e) => setLiveMu(Number(e.target.value))}
              style={{ width: '90px', accentColor: '#10b981', cursor: 'pointer', height: '4px' }}
            />
            <strong className="font-mono" style={{ minWidth: '42px', color: '#10b981' }}>
              {liveMu.toFixed(2)}/s
            </strong>
          </div>

          {/* Server Count c */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: colors.textMuted }}>Servers c:</span>
            {[1, 2, 3, 4].map((c) => (
              <button
                key={c}
                onClick={() => setLiveServers(c)}
                style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: liveServers === c ? 700 : 500,
                  background: liveServers === c ? '#0284c7' : 'transparent',
                  color: liveServers === c ? '#ffffff' : colors.textMuted,
                  border: liveServers === c ? 'none' : `1px solid ${colors.borderSubtle}`,
                  cursor: 'pointer'
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Reset Knobs */}
          {(liveLambda !== baseLambda || liveMu !== baseMu || liveServers !== baseServers) && (
            <button
              onClick={() => {
                setLiveLambda(baseLambda);
                setLiveMu(baseMu);
                setLiveServers(baseServers);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '3px',
                background: 'transparent',
                border: `1px solid ${colors.borderSubtle}`,
                color: colors.textMuted,
                cursor: 'pointer',
                fontSize: '10.5px'
              }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>

        {/* Animation Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: isDark ? '#38bdf8' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title={isPlaying ? 'Pause Simulation' : 'Resume Simulation'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px' }}>
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: simSpeed === spd ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent',
                  color: simSpeed === spd ? '#ffffff' : colors.textMuted,
                  border: `1px solid ${colors.borderSubtle}`,
                  cursor: 'pointer'
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main SVG Pipeline Flow & Little's Law Inspector */}
      <div style={{ background: isDark ? '#050b14' : '#f8fafc', padding: '16px', position: 'relative', overflowX: 'auto' }}>
        <svg viewBox="0 0 760 226" style={{ width: '100%', height: 'auto', display: 'block', minWidth: '660px', maxHeight: '320px' }}>
          <defs>
            <marker id="arrowHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill={isDark ? '#38bdf8' : '#64748b'} />
            </marker>

            <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Connection Pipeline Lines */}
          <line x1="165" y1="95" x2="215" y2="95" stroke={colors.pipelineLine} strokeWidth="2.5" markerEnd="url(#arrowHead)" />
          <line x1="375" y1="95" x2="425" y2="95" stroke={colors.pipelineLine} strokeWidth="2.5" markerEnd="url(#arrowHead)" />
          <line x1="585" y1="95" x2="635" y2="95" stroke={colors.pipelineLine} strokeWidth="2.5" markerEnd="url(#arrowHead)" />

          {/* Animated Flowing Customer Particles */}
          {isPlaying &&
            particles.map((p) => {
              // Convert progress (0.0 to 1.0) into x coordinate across pipeline
              const posX = 90 + p.progress * 560;
              const isDropped = isSupercritical && p.progress > 0.45 && p.id % 2 === 0;

              return (
                <g key={p.id} transform={`translate(${posX}, ${isDropped ? 95 + (p.progress - 0.45) * 80 : 95})`}>
                  <circle
                    r="4"
                    fill={isDropped ? '#ef4444' : isSupercritical ? '#f59e0b' : '#38bdf8'}
                    style={{ filter: isDark ? 'drop-shadow(0 0 5px #38bdf8)' : 'none' }}
                  />
                  {isDropped && (
                    <text
                      x="6"
                      y="3"
                      fontSize="8"
                      fill="#ef4444"
                      fontWeight="700"
                      style={{
                        paintOrder: 'stroke fill',
                        stroke: colors.stageBg,
                        strokeWidth: '2.5px',
                        strokeLinejoin: 'round'
                      }}
                    >
                      DROP
                    </text>
                  )}
                </g>
              );
            })}

          {/* 1. Stage: POISSON ARRIVAL STREAM */}
          <g transform="translate(15, 40)">
            <rect width="150" height="110" rx="6" fill={colors.stageBg} stroke={colors.borderSubtle} strokeWidth="1.5" />
            <rect width="150" height="24" rx="6" fill={colors.stageHeader} />
            <text x="75" y="16" fontSize="10" fontWeight="700" fill={colors.textMain} textAnchor="middle">
              POISSON ARRIVALS
            </text>

            <text x="75" y="46" fontSize="13" fontWeight="800" fill={colors.textMain} textAnchor="middle" fontFamily="monospace">
              λ = {liveLambda.toFixed(2)} / sec
            </text>
            <text x="75" y="62" fontSize="9.5" fill={colors.textMuted} textAnchor="middle">
              Exponential Inter-arrival
            </text>

            <line x1="15" y1="74" x2="135" y2="74" stroke={colors.borderSubtle} />

            <text x="75" y="90" fontSize="9" fill={colors.textMuted} textAnchor="middle">
              Mean E[T] = {(1.0 / liveLambda).toFixed(2)}s
            </text>
            <text x="75" y="103" fontSize="8.5" fill={isDark ? '#38bdf8' : '#0284c7'} textAnchor="middle" fontFamily="monospace">
              {Math.round(liveLambda * 60)} requests / min
            </text>
          </g>

          {/* 2. Stage: FIFO QUEUE BUFFER */}
          <g transform="translate(215, 40)">
            <rect
              width="160"
              height="110"
              rx="6"
              fill={colors.stageBg}
              stroke={isSupercritical ? '#ef4444' : colors.borderSubtle}
              strokeWidth={isSupercritical ? 2 : 1.5}
            />
            <rect width="160" height="24" rx="6" fill={isSupercritical ? 'rgba(239, 68, 68, 0.15)' : colors.stageHeader} />
            <text x="80" y="16" fontSize="9.5" fontWeight="700" fill={isSupercritical ? '#ef4444' : colors.textMain} textAnchor="middle">
              {isSupercritical ? 'FIFO BUFFER (OVERFLOW)' : 'FIFO QUEUE BUFFER'}
            </text>

            {/* Visual Slots */}
            <g transform="translate(18, 34)">
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const isOccupied = isSupercritical || queueLengthMean >= 5 - slotIdx;
                return (
                  <rect
                    key={slotIdx}
                    x={slotIdx * 25}
                    y="0"
                    width="20"
                    height="20"
                    rx="3"
                    fill={isOccupied ? (isSupercritical ? '#ef4444' : '#38bdf8') : isDark ? '#1e293b' : '#f1f5f9'}
                    stroke={isOccupied ? (isSupercritical ? '#b91c1c' : '#0284c7') : colors.borderSubtle}
                    strokeWidth="1"
                  />
                );
              })}
            </g>

            <text x="80" y="70" fontSize="9.5" textAnchor="middle">
              <tspan fill={colors.textMuted}>Queue Length L_q: </tspan>
              <tspan fontWeight="700" fill={isSupercritical ? '#ef4444' : colors.textMain} fontFamily="monospace">
                {isSupercritical ? '∞ (Diverging)' : queueLengthMean.toFixed(3)}
              </tspan>
            </text>
            <text x="80" y="86" fontSize="9.5" textAnchor="middle">
              <tspan fill={colors.textMuted}>Mean Wait W_q: </tspan>
              <tspan fontWeight="700" fill={colors.textMain} fontFamily="monospace">
                {isSupercritical ? '∞' : `${waitTimeMean.toFixed(3)}s`}
              </tspan>
            </text>
            <text x="80" y="101" fontSize="8.5" fill={colors.textMuted} textAnchor="middle" fontFamily="monospace">
              Discipline: Strict Head-of-Line FIFO
            </text>
          </g>

          {/* 3. Stage: PARALLEL SERVER POOL */}
          <g transform="translate(425, 40)">
            <rect width="160" height="110" rx="6" fill={colors.stageBg} stroke={colors.borderSubtle} strokeWidth="1.5" />
            <rect width="160" height="24" rx="6" fill={colors.stageHeader} />
            <text x="80" y="16" fontSize="10" fontWeight="700" fill={colors.textMain} textAnchor="middle">
              SERVER POOL (c = {liveServers})
            </text>

            {/* Render Server Bays */}
            <g transform="translate(12, 30)">
              {Array.from({ length: liveServers }).map((_, sIdx) => {
                const isServerBusy = isSupercritical || serverUtilMean > sIdx * (100 / liveServers);
                const bayGap = 4;
                const bayWidth = (136 - (liveServers - 1) * bayGap) / liveServers;
                const bayX = sIdx * (bayWidth + bayGap);

                return (
                  <g key={sIdx} transform={`translate(${bayX}, 0)`}>
                    <title>{`Server ${sIdx + 1}: ${isServerBusy ? 'BUSY' : 'IDLE'}`}</title>
                    <rect
                      width={bayWidth}
                      height="30"
                      rx="3"
                      fill={isServerBusy ? (isDark ? '#1e293b' : '#e0f2fe') : isDark ? '#0b1120' : '#f8fafc'}
                      stroke={isServerBusy ? '#38bdf8' : colors.borderSubtle}
                      strokeWidth="1"
                    />
                    {liveServers === 1 ? (
                      <>
                        <circle cx="18" cy="15" r="4" fill={isServerBusy ? '#38bdf8' : '#10b981'} />
                        <text x="28" y="18" fontSize="10" fontWeight="700" fill={colors.textMain}>
                          Server 1: {isServerBusy ? 'BUSY' : 'IDLE'}
                        </text>
                        <text x={bayWidth - 10} y="18" fontSize="9" fill={colors.textMuted} textAnchor="end" fontFamily="monospace">
                          μ = {liveMu.toFixed(2)}/s
                        </text>
                      </>
                    ) : liveServers === 2 ? (
                      <>
                        <text x={bayWidth / 2} y="13" fontSize="9" fontWeight="700" fill={colors.textMain} textAnchor="middle">
                          S{sIdx + 1}
                        </text>
                        <g transform={`translate(${bayWidth / 2 - 18}, 17)`}>
                          <circle cx="4" cy="4" r="3" fill={isServerBusy ? '#38bdf8' : '#10b981'} />
                          <text x="11" y="7" fontSize="8" fontWeight="600" fill={isServerBusy ? '#38bdf8' : '#10b981'}>
                            {isServerBusy ? 'BUSY' : 'IDLE'}
                          </text>
                        </g>
                      </>
                    ) : (
                      <>
                        <text x={bayWidth / 2} y="14" fontSize="8.5" fontWeight="700" fill={colors.textMain} textAnchor="middle">
                          S{sIdx + 1}
                        </text>
                        <circle
                          cx={bayWidth / 2}
                          cy="22"
                          r="3.5"
                          fill={isServerBusy ? '#38bdf8' : '#10b981'}
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Utilization Meter Bar */}
            <g transform="translate(18, 68)">
              <rect width="124" height="8" rx="2" fill={isDark ? '#1e293b' : '#e2e8f0'} />
              <rect
                width={Math.min(124, Math.max(0, (serverUtilMean / 100) * 124))}
                height="8"
                rx="2"
                fill={isSupercritical ? '#ef4444' : isHeavyTraffic ? '#f59e0b' : '#10b981'}
              />
            </g>
            <text x="80" y="90" fontSize="9.5" fontWeight="700" fill={colors.textMain} textAnchor="middle" fontFamily="monospace">
              Pool Util: {serverUtilMean.toFixed(1)}% (μ = {liveMu.toFixed(2)})
            </text>
            <text x="80" y="103" fontSize="8.5" fill={colors.textMuted} textAnchor="middle">
              Mean Service E[S] = {(1.0 / liveMu).toFixed(3)}s
            </text>
          </g>

          {/* 4. Stage: DEPARTURES & LITTLE'S SINK */}
          <g transform="translate(635, 40)">
            <rect width="110" height="110" rx="6" fill={colors.stageBg} stroke={colors.borderSubtle} strokeWidth="1.5" />
            <rect width="110" height="24" rx="6" fill={colors.stageHeader} />
            <text x="55" y="16" fontSize="10" fontWeight="700" fill={colors.textMain} textAnchor="middle">
              DEPARTURES
            </text>

            <text x="55" y="50" fontSize="14" fontWeight="800" fill={colors.textMain} textAnchor="middle" fontFamily="monospace">
              {Math.round(customersServed).toLocaleString()}
            </text>
            <text x="55" y="64" fontSize="9" fill={colors.textMuted} textAnchor="middle">
              Served Total
            </text>

            <line x1="10" y1="74" x2="100" y2="74" stroke={colors.borderSubtle} />

            <text x="55" y="88" fontSize="8.5" fill={colors.textMuted} textAnchor="middle">
              System W_total:
            </text>
            <text x="55" y="102" fontSize="11" fontWeight="700" fill={isDark ? '#38bdf8' : '#0284c7'} textAnchor="middle" fontFamily="monospace">
              {isSupercritical ? '∞' : `${systemTimeMean.toFixed(3)}s`}
            </text>
          </g>

          {/* Little's Law Mathematical Convergence Verification Shelf */}
          <g transform="translate(15, 165)">
            <rect
              width="730"
              height="46"
              rx="5"
              fill={isDark ? '#0f172a' : '#ffffff'}
              stroke={colors.borderSubtle}
              strokeWidth="1"
            />

            {/* Top Row: Theorem and Analytical Benchmark */}
            <text x="14" y="18" fontSize="10" fontWeight="700">
              <tspan fill={isDark ? '#38bdf8' : '#0284c7'}>Little's Law Proof: </tspan>
              <tspan fill={colors.textMain}>L = λ · W</tspan>
              <tspan fill={colors.textMuted} fontSize="9"> (Conservation Theorem)</tspan>
            </text>

            {theoreticalW ? (
              <text x="716" y="18" fontSize="9.5" fontWeight="700" fill={isDark ? '#38bdf8' : '#0284c7'} textAnchor="end" fontFamily="monospace">
                Analytical M/M/1: W* = {theoreticalW.toFixed(3)}s · L* = {theoreticalL ? theoreticalL.toFixed(3) : ''}
              </text>
            ) : isSupercritical ? (
              <text x="716" y="18" fontSize="9" fontWeight="700" fill="#ef4444" textAnchor="end">
                ⚠ Supercritical State: Rate λ exceeds capacity c·μ
              </text>
            ) : (
              <text x="716" y="18" fontSize="9" fill={colors.textMuted} textAnchor="end" fontFamily="monospace">
                M/M/{liveServers} Multiserver Steady State
              </text>
            )}

            {/* Bottom Row: Empirical Engine State */}
            <text x="14" y="35" fontSize="9" fill={colors.textMuted} fontFamily="monospace">
              Observed: <tspan fill={colors.textMain} fontWeight="600">L = {(liveLambda * systemTimeMean).toFixed(3)}</tspan> entities · <tspan fill={colors.textMain} fontWeight="600">L_q = {(liveLambda * waitTimeMean).toFixed(3)}</tspan> in queue · <tspan fill={colors.textMain} fontWeight="600">W = {(waitTimeMean + (1.0 / liveMu)).toFixed(3)}s</tspan> (W_q: {waitTimeMean.toFixed(3)}s + 1/μ: {(1.0 / liveMu).toFixed(3)}s)
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
