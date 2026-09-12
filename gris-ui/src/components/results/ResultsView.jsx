import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, XCircle, GitCompare, BarChart2,
  Download, FileDown, Copy, Terminal, ChevronDown, ChevronUp, Search,
  Play, Pause, SkipBack, SkipForward, RotateCcw, Lightbulb, Activity, FileText, FileSpreadsheet
} from 'lucide-react';
import {
  exportScenarioToXlsx,
  exportScenarioToExcel,
  exportScenarioToCsv,
  exportScenarioToJson
} from '../../utils/reportExporter';
import { PdfReportModal } from '../modals/PdfReportModal';
import { TerminalDockCanvas } from '../canvas/TerminalDockCanvas';
import { MobilityNetworkCanvas } from '../canvas/MobilityNetworkCanvas';
import { QueueNetworkCanvas } from '../canvas/QueueNetworkCanvas';

function ConfidenceIntervalWhisker({ mean, lower, upper, min, max, replicationValues = [], unit = '' }) {
  const rangeMin = min !== undefined ? Math.min(min, lower) : lower * 0.9;
  const rangeMax = max !== undefined ? Math.max(max, upper) : upper * 1.1;
  const totalSpan = rangeMax - rangeMin > 0 ? rangeMax - rangeMin : 1.0;

  const getPct = (val) => Math.max(0, Math.min(100, ((val - rangeMin) / totalSpan) * 100));

  const lowerPct = getPct(lower);
  const meanPct = getPct(mean);
  const upperPct = getPct(upper);
  const widthPct = Math.max(3, upperPct - lowerPct);

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        <span>95% CI: <strong className="font-mono" style={{ color: 'var(--text-secondary)' }}>[{lower.toFixed(3)}{unit} to {upper.toFixed(3)}{unit}]</strong></span>
        <span>Mean: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{mean.toFixed(3)}{unit}</strong></span>
      </div>

      <div style={{
        height: '8px',
        background: '#f1f5f9',
        borderRadius: '4px',
        position: 'relative',
        border: '1px solid #e2e8f0',
        overflow: 'visible',
      }}>
        {/* Confidence Interval Span */}
        <div style={{
          position: 'absolute',
          left: `${lowerPct}%`,
          width: `${widthPct}%`,
          height: '100%',
          background: '#cbd5e1',
          borderRadius: '3px',
        }} />

        {/* Individual Monte Carlo Replication Jitter Dots */}
        {replicationValues && replicationValues.map((val, idx) => {
          const ptPct = getPct(val);
          return (
            <div
              key={idx}
              title={`Replication #${idx + 1}: ${val.toFixed(4)}${unit}`}
              style={{
                position: 'absolute',
                left: `calc(${ptPct}% - 2.5px)`,
                top: '1.5px',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#475569',
                opacity: 0.65,
                zIndex: 2,
                cursor: 'pointer',
              }}
            />
          );
        })}

        {/* Mean Point Indicator */}
        <div
          title={`Sample Grand Mean: ${mean.toFixed(4)}${unit}`}
          style={{
            position: 'absolute',
            left: `calc(${meanPct}% - 4px)`,
            top: '-1px',
            width: '8px',
            height: '10px',
            borderRadius: '2px',
            background: 'var(--text-primary)',
            boxShadow: '0 0 0 1px #ffffff',
            zIndex: 3,
          }}
        />
      </div>

      {replicationValues && replicationValues.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            • {replicationValues.length} Monte Carlo runs plotted
          </span>
        </div>
      )}
    </div>
  );
}

function DistributionHistogramAndEcdf({ replicationValues = [], mean, _lower, _upper, unit = '' }) {
  if (!replicationValues || replicationValues.length < 2) {
    return (
      <div style={{ padding: '8px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Insufficient replication data for distribution plot (N &lt; 2)
      </div>
    );
  }

  const sorted = [...replicationValues].sort((a, b) => a - b);
  const n = sorted.length;
  const minVal = sorted[0];
  const maxVal = sorted[n - 1];
  const p50 = sorted[Math.floor(n * 0.5)];
  const p90 = sorted[Math.min(n - 1, Math.floor(n * 0.9))];

  const span = maxVal - minVal > 0 ? maxVal - minVal : 1.0;
  const numBins = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(n))));
  const binWidth = span / numBins;

  const bins = Array.from({ length: numBins }, (_, i) => ({
    start: minVal + i * binWidth,
    end: minVal + (i + 1) * binWidth,
    count: 0
  }));

  sorted.forEach((val) => {
    let bIndex = Math.floor((val - minVal) / binWidth);
    if (bIndex >= numBins) bIndex = numBins - 1;
    bins[bIndex].count += 1;
  });

  const maxCount = Math.max(1, ...bins.map((b) => b.count));

  // SVG dimensions
  const width = 340;
  const height = 75;
  const padLeft = 12;
  const padRight = 36;
  const padTop = 10;
  const padBottom = 16;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const barW = Math.max(2, plotW / numBins - 2);

  // eCDF step points
  const ecdfPoints = sorted.map((val, idx) => {
    const x = padLeft + ((val - minVal) / span) * plotW;
    const y = padTop + plotH - ((idx + 1) / n) * plotH;
    return { x, y };
  });

  let pathD = '';
  if (ecdfPoints.length > 0) {
    pathD = `M ${padLeft} ${padTop + plotH}`;
    ecdfPoints.forEach((pt) => {
      pathD += ` H ${pt.x.toFixed(1)} V ${pt.y.toFixed(1)}`;
    });
    pathD += ` H ${padLeft + plotW}`;
  }

  const meanX = padLeft + Math.max(0, Math.min(plotW, ((mean - minVal) / span) * plotW));
  const p50X = padLeft + Math.max(0, Math.min(plotW, ((p50 - minVal) / span) * plotW));

  return (
    <div style={{ marginTop: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        <span>Empirical PDF &amp; Cumulative eCDF</span>
        <span className="font-mono">
          Median: <strong style={{ color: '#065f46' }}>{p50.toFixed(2)}{unit}</strong> | P90: <strong style={{ color: '#1e3a8a' }}>{p90.toFixed(2)}{unit}</strong>
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke="#cbd5e1" strokeWidth="1" />

        {bins.map((bin, i) => {
          const bHeight = (bin.count / maxCount) * plotH;
          const bx = padLeft + i * (plotW / numBins) + 1;
          const by = padTop + plotH - bHeight;
          return (
            <rect
              key={i}
              x={bx}
              y={by}
              width={barW}
              height={Math.max(1, bHeight)}
              fill="#94a3b8"
              opacity="0.65"
              rx="1"
            >
              <title>{`Range: [${bin.start.toFixed(2)} - ${bin.end.toFixed(2)}${unit}]\nCount: ${bin.count} (${((bin.count / n) * 100).toFixed(0)}%)`}</title>
            </rect>
          );
        })}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <line x1={meanX} y1={padTop} x2={meanX} y2={padTop + plotH} stroke="#0f172a" strokeWidth="1.5" strokeDasharray="2 2">
          <title>{`Sample Mean: ${mean.toFixed(3)}${unit}`}</title>
        </line>

        <line x1={p50X} y1={padTop} x2={p50X} y2={padTop + plotH} stroke="#059669" strokeWidth="1.5">
          <title>{`P50 Median: ${p50.toFixed(3)}${unit}`}</title>
        </line>

        <text x={padLeft} y={height - 2} fontSize="9" fill="#94a3b8" textAnchor="start">{minVal.toFixed(1)}</text>
        <text x={padLeft + plotW} y={height - 2} fontSize="9" fill="#94a3b8" textAnchor="end">{maxVal.toFixed(1)}{unit}</text>
        <text x={width - 4} y={padTop + 7} fontSize="8" fill="#2563eb" textAnchor="end">100%</text>
        <text x={width - 4} y={padTop + plotH} fontSize="8" fill="#2563eb" textAnchor="end">0%</text>
      </svg>
    </div>
  );
}

function AutomatedDiagnosticCard({ scenario }) {
  if (!scenario || !scenario.results) return null;

  const { modelType, parameters = {}, results } = scenario;
  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};

  let healthStatus = 'OPTIMAL';
  let badgeColor = 'badge-emerald';
  let title = 'System Health Nominal';
  let diagnosis = '';
  let recommendations = [];
  let telemetryPills = [];

  if (modelType === 'mm1-queue') {
    const l = Number(parameters.lambda || 0.5);
    const m = Number(parameters.mu || 1.0);
    const s = Number(parameters.servers || 1);
    const rho = (s > 0 && m > 0) ? l / (s * m) : 0;
    const qLen = timeWeightedMetrics['queue.length']?.mean || 0;
    const waitTime = sampleMetrics['customer.waiting_time']?.mean || 0;

    telemetryPills = [
      { label: 'Traffic Intensity ρ', value: `${(rho * 100).toFixed(1)}%` },
      { label: 'Parallel Servers', value: `${s}` },
      { label: 'Mean Queue L_q', value: `${qLen.toFixed(2)}` },
      { label: 'Avg Wait W_q', value: `${waitTime.toFixed(3)}s` },
    ];

    if (rho >= 1.0) {
      healthStatus = 'CRITICAL / UNSTABLE';
      badgeColor = 'badge-rose';
      title = 'Supercritical Ergodicity Violation (ρ ≥ 1.0)';
      diagnosis = `Queue intensity ρ = ${rho.toFixed(2)} exceeds server capacity. Little's Law steady-state does not exist; queues will grow without bound.`;
      recommendations = [
        `Increase server count 'servers' from ${s} to ${Math.ceil(l / m) + 1}`,
        `Increase service rate 'mu' to > ${(l / s).toFixed(2)} customers/second`,
      ];
    } else if (rho >= 0.82) {
      healthStatus = 'HEAVY TRAFFIC / CONGESTED';
      badgeColor = 'badge-amber';
      title = 'Heavy Traffic Regime Detected';
      diagnosis = `Server utilization is ${(rho * 100).toFixed(1)}%. Non-linear queuing delays amplify with small arrival bursts.`;
      recommendations = [
        `Add an additional parallel server (c = ${s + 1}) to drop utilization under 60%`,
        `Evaluate finite buffer 'capacity' to bound maximum waiting times`,
      ];
    } else {
      healthStatus = 'EQUILIBRIUM STABLE';
      badgeColor = 'badge-emerald';
      title = 'Subcritical Ergodic Stability Verified';
      diagnosis = `Queue operates in comfortable equilibrium (ρ = ${(rho * 100).toFixed(1)}%). Waiting time standard error is well-bounded.`;
      recommendations = [
        `System is well-sized for nominal throughput without queue buildup`,
      ];
    }
  } else if (modelType === 'caucedo-terminal') {
    const berthUtil = (timeWeightedMetrics['berth.utilization']?.mean || 0) * 100;
    const craneUtil = (timeWeightedMetrics['crane.utilization']?.mean || 0) * 100;
    const turnaroundHours = sampleMetrics['vessel.turnaround_hours']?.mean || 0;
    const waitingHours = sampleMetrics['vessel.waiting_hours']?.mean || 0;
    const vesselsServed = counters['vessels.served']?.mean || 0;

    telemetryPills = [
      { label: 'Berth Util', value: `${berthUtil.toFixed(1)}%` },
      { label: 'Crane Util', value: `${craneUtil.toFixed(1)}%` },
      { label: 'Anchorage Wait', value: `${waitingHours.toFixed(1)}h` },
      { label: 'Turnaround', value: `${turnaroundHours.toFixed(1)}h` },
      { label: 'Vessels Served', value: `${Math.round(vesselsServed)}` },
    ];

    if (berthUtil > 82 && waitingHours > 4) {
      healthStatus = 'BERTH CONSTRAINED';
      badgeColor = 'badge-rose';
      title = 'Quay Berth Bottleneck';
      diagnosis = `Berth utilization is high (${berthUtil.toFixed(1)}%) and average anchorage wait is ${waitingHours.toFixed(1)}h. Ship arrivals exceed berthing capacity.`;
      recommendations = [
        `Increase physical berths from ${parameters.berths || 3} to ${Number(parameters.berths || 3) + 1}`,
        `Switch cranePolicy to 'DYNAMIC' to speed up turnaround at occupied berths`,
        `Benchmark higher moves per hour (GMPH) to accelerate container discharge`,
      ];
    } else if (craneUtil > 85) {
      healthStatus = 'CRANE BOUND';
      badgeColor = 'badge-amber';
      title = 'STS Quay Crane Saturation';
      diagnosis = `Crane utilization is at ${craneUtil.toFixed(1)}%. Vessel turnaround is bound by container crane handling capacity.`;
      recommendations = [
        `Deploy additional STS quay cranes (currently ${parameters.quayCranes || 8})`,
        `Benchmark crane productivity higher than ${parameters.movesPerHourPerCrane || 28} GMPH with tandem lifts`,
        `Evaluate dynamic crane allocation to reassign cranes to largest container vessels`,
      ];
    } else {
      healthStatus = 'PORT BALANCED';
      badgeColor = 'badge-emerald';
      title = 'Berth & Crane Equilibrium Achieved';
      diagnosis = `Quay berths (${berthUtil.toFixed(1)}%) and STS cranes (${craneUtil.toFixed(1)}%) operate in balanced coordination with ${turnaroundHours.toFixed(1)}h average turnaround and ${waitingHours.toFixed(1)}h anchorage wait.`;
      recommendations = [
        `Operational settings provide sufficient surge margin for schedule disruptions`,
        `Current crane-to-berth allocation maintains high throughput without congestion`,
      ];
    }
  } else if (modelType === 'mobility-dispatch' || modelType === 'mobility') {
    const fleetUtil = (timeWeightedMetrics['fleet.utilization']?.mean || 0) * 100;
    const completed = counters['trips.completed']?.mean || 0;
    const cancelled = counters['trips.cancelled']?.mean || 0;
    const total = completed + cancelled;
    const cancelRate = total > 0 ? (cancelled / total) * 100 : 0;
    const waitSec = sampleMetrics['trip.waiting_time']?.mean || 0;

    telemetryPills = [
      { label: 'Fleet Util', value: `${fleetUtil.toFixed(1)}%` },
      { label: 'Trips Done', value: `${Math.round(completed).toLocaleString()}` },
      { label: 'Cancel Rate', value: `${cancelRate.toFixed(1)}%` },
      { label: 'Avg Wait', value: `${(waitSec / 60).toFixed(1)} min` },
    ];

    if (cancelRate > 12) {
      healthStatus = 'SUPPLY SHORTAGE';
      badgeColor = 'badge-rose';
      title = 'High Passenger Reneging / Cancellation';
      diagnosis = `${cancelRate.toFixed(1)}% of trip requests were cancelled due to pickup waits exceeding passenger tolerance (${(waitSec / 60).toFixed(1)} min avg wait). Fleet supply cannot meet regional demand.`;
      recommendations = [
        `Increase fleet size from ${parameters.fleetSize || 400} to ${Math.round((parameters.fleetSize || 400) * 1.3)} vehicles`,
        `Switch dispatch policy to 'BATCHED' for global spatial bipartite matching`,
        `Increase passenger wait tolerance or reduce request rate multiplier`,
      ];
    } else if (fleetUtil > 85) {
      healthStatus = 'FLEET STRESSED';
      badgeColor = 'badge-amber';
      title = 'Fleet Capacity Constrained';
      diagnosis = `Fleet utilization is elevated at ${fleetUtil.toFixed(1)}%. Little reserve capacity exists for peak rush demand across Manhattan and airport corridors.`;
      recommendations = [
        `Enable 'ANTICIPATORY' relocation to preposition idle cabs in Manhattan before rush hours`,
        `Expand fleet size by 15-20% to absorb demand spikes without customer wait surges`,
      ];
    } else {
      healthStatus = 'FLEET BALANCED';
      badgeColor = 'badge-emerald';
      title = 'Urban Dispatch Equilibrium Verified';
      diagnosis = `Fleet operates at ${fleetUtil.toFixed(1)}% utilization with low cancellation rate (${cancelRate.toFixed(1)}%) and ${(waitSec / 60).toFixed(1)} min average pickup wait across NYC TLC zones.`;
      recommendations = [
        `Supply-demand ratio is well-calibrated for current diurnal profile`,
        `Current dispatch policy effectively covers Manhattan hubs, Brooklyn, and airports`,
      ];
    }
  }

  return (
    <div className="panel" style={{
      marginBottom: '18px',
      background: '#ffffff',
      border: '1px solid var(--border-subtle)',
      borderLeft: `4px solid ${badgeColor.includes('emerald') ? '#10b981' : badgeColor.includes('amber') ? '#f59e0b' : '#ef4444'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Activity size={15} style={{ color: 'var(--text-primary)' }} />
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Automated Diagnostic & Bottleneck Analysis
          </h3>
          <span className={`badge ${badgeColor}`} style={{ fontSize: '10.5px' }}>
            {healthStatus}
          </span>
        </div>
        <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {title}
        </strong>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: recommendations.length > 0 ? 'repeat(auto-fit, minmax(360px, 1fr))' : '1fr',
        gap: '12px',
        alignItems: 'start'
      }}>
        {/* Left Column: Model Telemetry & Diagnostic Assessment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            {diagnosis}
          </p>
          {telemetryPills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
              {telemetryPills.map((pill, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{pill.label}:</span>
                  <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{pill.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recommendations & Actionable Adjustments */}
        {recommendations.length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              <Lightbulb size={12} style={{ color: '#d97706', flexShrink: 0 }} />
              <span>Recommended Parameter Adjustments:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {recommendations.map((rec, i) => (
                <li key={i} style={{ marginBottom: i < recommendations.length - 1 ? '3px' : 0 }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResultsView({ scenario, onCompareWith, onCloneToForm, onGoToStudio }) {
  const [traceSearch, setTraceSearch] = useState('');
  const [isTraceOpen, setIsTraceOpen] = useState(true);
  const [activeTraceIndex, setActiveTraceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [metricViewMode, setMetricViewMode] = useState('whisker'); // 'whisker' | 'distribution'
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const activeRowRef = useRef(null);

  const results = scenario?.results || {};
  const eventTrace = results.eventTrace || [];

  // Playback timer
  useEffect(() => {
    let timer = null;
    if (isPlaying && eventTrace.length > 0) {
      const delay = 500 / playbackSpeed;
      timer = setInterval(() => {
        setActiveTraceIndex((prev) => {
          if (prev >= eventTrace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, eventTrace.length]);

  // Scroll active trace row into view
  useEffect(() => {
    if (activeRowRef.current && isPlaying) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTraceIndex, isPlaying]);

  if (!scenario || !scenario.results) {
    return (
      <div className="panel" style={{ marginBottom: '20px', textAlign: 'center', padding: '40px 20px' }}>
        <BarChart2 size={32} style={{ color: '#94a3b8', margin: '0 auto 10px auto', display: 'block' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          No Simulation Run Selected
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 16px auto' }}>
          Execute a scenario from the Studio workbench or pick a completed run from the Runs History to inspect 2D digital twins, 95% confidence intervals, and micro-event trace playback.
        </p>
        {onGoToStudio && (
          <button type="button" className="btn btn-primary" onClick={onGoToStudio} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Go to Studio / Model
          </button>
        )}
      </div>
    );
  }

  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};

  const filteredTrace = eventTrace.filter((ev) => {
    if (!traceSearch) return true;
    const q = traceSearch.toLowerCase();
    return ev.type?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q);
  });

  const activeEvent = filteredTrace[activeTraceIndex] || eventTrace[activeTraceIndex] || null;

  const handleExportJson = () => {
    exportScenarioToJson(scenario);
  };

  const handleExportCsv = () => {
    exportScenarioToCsv(scenario);
  };

  const handleExportXlsx = () => {
    exportScenarioToXlsx(scenario);
  };

  const handleExportXls = () => {
    exportScenarioToExcel(scenario);
  };

  const handleCopyMarkdown = () => {
    const lines = [
      `# Gris Simulation Report: ${scenario.name}`,
      `- **Model**: \`${scenario.modelType}\``,
      `- **Virtual Horizon**: ${scenario.horizon?.toLocaleString()}s (${(scenario.horizon / 3600).toFixed(1)} hrs)`,
      `- **Replications**: ${scenario.replications} (Student-t 95% Confidence Interval)`,
      `- **Base Seed**: ${scenario.seedBase}`,
      `- **Events Processed**: ${results.totalEventsProcessed?.toLocaleString()} (Wall-Clock: ${scenario.wallClockMs}ms)`,
      '',
      '## Sample Performance Metrics',
      '| Metric | Mean | 95% CI Half-Width | 95% CI Interval | Min | Max |',
      '|---|---|---|---|---|---|',
    ];

    Object.entries(sampleMetrics).forEach(([k, m]) => {
      lines.push(`| \`${k}\` | ${m.mean.toFixed(3)} | ±${m.confidenceInterval95HalfWidth.toFixed(3)} | [${m.confidenceInterval95Lower.toFixed(3)} to ${m.confidenceInterval95Upper.toFixed(3)}] | ${m.min.toFixed(3)} | ${m.max.toFixed(3)} |`);
    });

    if (Object.keys(timeWeightedMetrics).length > 0) {
      lines.push('');
      lines.push('## Time-Weighted Resource Utilization');
      lines.push('| Resource | Mean Utilization | Raw Average |');
      lines.push('|---|---|---|');
      Object.entries(timeWeightedMetrics).forEach(([k, m]) => {
        lines.push(`| \`${k}\` | ${(m.mean * 100).toFixed(1)}% | ${m.mean.toFixed(4)} |`);
      });
    }

    if (Object.keys(counters).length > 0) {
      lines.push('');
      lines.push('## Event Counters');
      lines.push('| Counter | Mean Count | 95% Half-Width |');
      lines.push('|---|---|---|');
      Object.entries(counters).forEach(([k, m]) => {
        lines.push(`| \`${k}\` | ${Math.round(m.mean).toLocaleString()} | ±${m.confidenceInterval95HalfWidth.toFixed(1)} |`);
      });
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2200);
  };

  // M/M/1 Ground Truth Verification
  let mm1Verification = null;
  if (scenario.modelType === 'mm1-queue') {
    const p = scenario.parameters || {};
    const l = Number(p.lambda || 0.5);
    const m = Number(p.mu || 1.0);
    const s = Number(p.servers || 1);
    if (s === 1 && m > l) {
      const theoreticalW = 1.0 / (m - l);
      const systemTimeMetric = sampleMetrics['steady.customer.system_time'];
      if (systemTimeMetric) {
        const captured = theoreticalW >= systemTimeMetric.confidenceInterval95Lower &&
                         theoreticalW <= systemTimeMetric.confidenceInterval95Upper;
        mm1Verification = {
          theoreticalW,
          empiricalMean: systemTimeMetric.mean,
          captured,
          lower: systemTimeMetric.confidenceInterval95Lower,
          upper: systemTimeMetric.confidenceInterval95Upper,
        };
      }
    }
  }

  const currentEvent = eventTrace[activeTraceIndex] || null;

  return (
    <div id="scenario-results" className="panel" style={{ marginBottom: '20px' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
            <span className="badge badge-emerald">Completed</span>
            <span className="badge badge-neutral font-mono" style={{ fontSize: '10.5px' }}>
              {scenario.modelType}
            </span>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
              {scenario.name}
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {scenario.description || 'Simulation results across parallel Monte Carlo replications.'}
          </p>

          {/* Direct Section Jump Anchors */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '3px 8px' }}
              onClick={() => document.getElementById('digital-twin-schematic')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Digital Twin Schematic
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '3px 8px' }}
              onClick={() => document.getElementById('sample-metrics')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Sample Metrics ({Object.keys(sampleMetrics).length})
            </button>
            {Object.keys(timeWeightedMetrics).length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', padding: '3px 8px' }}
                onClick={() => document.getElementById('time-weighted-resources')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Time-Weighted Resources ({Object.keys(timeWeightedMetrics).length})
              </button>
            )}
            {Object.keys(counters).length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', padding: '3px 8px' }}
                onClick={() => document.getElementById('event-counters')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Event Counters ({Object.keys(counters).length})
              </button>
            )}
            {eventTrace.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', padding: '3px 8px' }}
                onClick={() => document.getElementById('event-trace-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Calendar Trace ({eventTrace.length})
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onCloneToForm && (
            <button
              type="button"
              className="btn btn-secondary"
              title="Load parameters into form for adjustment"
              onClick={() => onCloneToForm(scenario)}
            >
              <Copy size={13} />
              Clone to Form
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            title="Preview and download publication-grade Executive Decision PDF Report"
            onClick={() => setIsPdfModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#f87171'
            }}
          >
            <FileText size={13} style={{ color: '#ef4444' }} />
            <span>Executive PDF</span>
          </button>

          <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              title="Download publication-grade Microsoft Excel Workbook (.xlsx) with 5 structured sheets"
              onClick={handleExportXlsx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                borderRadius: 0,
                background: 'rgba(16, 185, 129, 0.08)',
                color: '#34d399',
                padding: '6px 11px'
              }}
            >
              <FileSpreadsheet size={13} style={{ color: '#10b981' }} />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              title="Download binary Microsoft Excel Workbook (.xls)"
              onClick={handleExportXls}
              style={{
                border: 'none',
                borderLeft: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 0,
                background: 'rgba(16, 185, 129, 0.05)',
                color: '#6ee7b7',
                fontSize: '11px',
                fontWeight: 600,
                padding: '6px 9px'
              }}
            >
              .xls
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            title="Download metrics table as CSV"
            onClick={handleExportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <FileDown size={13} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            title="Download full scenario data as JSON"
            onClick={handleExportJson}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Download size={13} />
            <span>JSON</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            title="Copy structured markdown report to clipboard"
            onClick={handleCopyMarkdown}
            style={{ color: copiedMarkdown ? '#065f46' : 'var(--text-secondary)' }}
          >
            {copiedMarkdown ? <CheckCircle2 size={13} style={{ color: '#059669' }} /> : <FileText size={13} />}
            <span>{copiedMarkdown ? 'Report Copied!' : 'Copy Report'}</span>
          </button>

          {onCompareWith && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onCompareWith(scenario)}
            >
              <GitCompare size={13} />
              Add to Comparison
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        marginBottom: '16px',
      }}>
        <div className="panel-elevated">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Events</span>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {results.totalEventsProcessed?.toLocaleString()}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Wall-clock: {scenario.wallClockMs}ms
          </span>
        </div>

        <div className="panel-elevated">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Throughput</span>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {scenario.wallClockMs > 0
              ? Math.round((results.totalEventsProcessed / (scenario.wallClockMs / 1000))).toLocaleString()
              : '-'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>events/second</span>
        </div>

        <div className="panel-elevated">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Replications</span>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {scenario.replications}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Student-t 95% CI</span>
        </div>

        <div className="panel-elevated">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Virtual Horizon</span>
          <div className="font-mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {scenario.horizon?.toLocaleString()}s
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ≈ {(scenario.horizon / 3600).toFixed(1)} hours
          </span>
        </div>
      </div>

      {/* Automated Diagnostic & Bottleneck Analysis Card */}
      <AutomatedDiagnosticCard scenario={scenario} />

      {/* Digital Twin Schematics */}
      <div id="digital-twin-schematic">
        {scenario.modelType === 'caucedo-terminal' && (
          <TerminalDockCanvas scenario={scenario} activeEvent={activeEvent} />
        )}
        {(scenario.modelType === 'mobility-dispatch' || scenario.modelType === 'mobility') && (
          <MobilityNetworkCanvas scenario={scenario} activeEvent={activeEvent} />
        )}
        {scenario.modelType === 'mm1-queue' && (
          <QueueNetworkCanvas scenario={scenario} activeEvent={activeEvent} />
        )}
      </div>

      {/* M/M/1 Ground Truth Banner */}
      {mm1Verification && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          background: mm1Verification.captured ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${mm1Verification.captured ? '#a7f3d0' : '#fecaca'}`,
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mm1Verification.captured ? <CheckCircle2 size={16} style={{ color: '#065f46' }} /> : <XCircle size={16} style={{ color: '#991b1b' }} />}
            <div>
              <strong style={{ fontSize: '12.5px', color: mm1Verification.captured ? '#065f46' : '#991b1b' }}>
                Analytical Closed-Form Ground Truth Validation
              </strong>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Theoretical W = {mm1Verification.theoreticalW.toFixed(4)}s is {mm1Verification.captured ? 'captured within' : 'outside'} empirical 95% CI [{mm1Verification.lower.toFixed(4)} - {mm1Verification.upper.toFixed(4)}].
              </div>
            </div>
          </div>
          <span className={`badge ${mm1Verification.captured ? 'badge-emerald' : 'badge-rose'}`}>
            {mm1Verification.captured ? 'Proof Validated' : 'Proof Diverged'}
          </span>
        </div>
      )}

      {/* Sample Metrics Header with View Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 id="sample-metrics" style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>
          Sample-Based Performance Metrics (Discrete Observations)
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Visualizer:</span>
          <button
            type="button"
            className={`preset-pill ${metricViewMode === 'whisker' ? 'active' : ''}`}
            onClick={() => setMetricViewMode('whisker')}
            style={{ fontSize: '10.5px', padding: '2px 8px' }}
          >
            95% CI Whisker
          </button>
          <button
            type="button"
            className={`preset-pill ${metricViewMode === 'distribution' ? 'active' : ''}`}
            onClick={() => setMetricViewMode('distribution')}
            style={{ fontSize: '10.5px', padding: '2px 8px' }}
          >
            Histogram &amp; eCDF
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginBottom: '18px' }}>
        {Object.entries(sampleMetrics).map(([key, metric]) => (
          <div key={key} className="panel-elevated">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className="font-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {key}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                N = {metric.replications}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
              <span className="font-mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {metric.mean.toFixed(3)}
              </span>
              <span className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                ± {metric.confidenceInterval95HalfWidth.toFixed(3)} (95% CI)
              </span>
            </div>

            {metricViewMode === 'whisker' ? (
              <ConfidenceIntervalWhisker
                mean={metric.mean}
                lower={metric.confidenceInterval95Lower}
                upper={metric.confidenceInterval95Upper}
                min={metric.min}
                max={metric.max}
                replicationValues={metric.replicationValues}
              />
            ) : (
              <DistributionHistogramAndEcdf
                mean={metric.mean}
                lower={metric.confidenceInterval95Lower}
                upper={metric.confidenceInterval95Upper}
                replicationValues={metric.replicationValues}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Std: {(metric.standardDeviation ?? metric.stdDev)?.toFixed(3)}</span>
              <span>Min: {metric.min?.toFixed(3)}</span>
              <span>Max: {metric.max?.toFixed(3)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Time-Weighted Metrics */}
      {Object.keys(timeWeightedMetrics).length > 0 && (
        <>
          <h3 id="time-weighted-resources" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
            Time-Weighted Resource Utilization
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginBottom: '18px' }}>
            {Object.entries(timeWeightedMetrics).map(([key, metric]) => {
              const utilPct = metric.mean * 100;
              return (
                <div key={key} className="panel-elevated">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="font-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {key}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Mean Utilization
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                    <span className="font-mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {utilPct.toFixed(1)}%
                    </span>
                    <span className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      (raw: {metric.mean.toFixed(4)})
                    </span>
                  </div>

                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, utilPct))}%`,
                      background: 'var(--text-primary)',
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Counters */}
      {Object.keys(counters).length > 0 && (
        <>
          <h3 id="event-counters" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
            Event Counters
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {Object.entries(counters).map(([key, metric]) => (
              <div key={key} className="panel-elevated">
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                  {key}
                </span>
                <div className="font-mono" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {Math.round(metric.mean).toLocaleString()}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ± {metric.confidenceInterval95HalfWidth.toFixed(1)} / rep
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 4. Discrete-Event Calendar Trace with Interactive Playback Scrubber */}
      {eventTrace.length > 0 && (
        <div id="event-trace-section" style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} style={{ color: 'var(--text-primary)' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 600 }}>
                Discrete-Event Calendar Micro-Trace (Interactive Event Playback)
              </h3>
              <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>Replication #0 ({eventTrace.length} events)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={traceSearch}
                  onChange={(e) => setTraceSearch(e.target.value)}
                  className="input-text"
                  style={{ fontSize: '11px', padding: '3px 8px 3px 24px', width: '160px' }}
                />
                <Search size={11} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-muted)' }} />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => setIsTraceOpen(!isTraceOpen)}
              >
                {isTraceOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {isTraceOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          {isTraceOpen && (
            <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
              {/* Playback Controls Toolbar */}
              <div style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                {/* Transport Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    title="Jump to first event"
                    style={{ padding: '4px 6px', fontSize: '11px' }}
                    onClick={() => { setActiveTraceIndex(0); setIsPlaying(false); }}
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    title="Step backward"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => {
                      setActiveTraceIndex(prev => Math.max(0, prev - 1));
                      setIsPlaying(false);
                    }}
                    disabled={activeTraceIndex <= 0}
                  >
                    <SkipBack size={12} />
                  </button>
                  <button
                    type="button"
                    className={isPlaying ? 'btn btn-secondary' : 'btn btn-primary'}
                    style={{ padding: '4px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    <span>{isPlaying ? 'Pause' : 'Play Trace'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    title="Step forward"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => {
                      setActiveTraceIndex(prev => Math.min(eventTrace.length - 1, prev + 1));
                      setIsPlaying(false);
                    }}
                    disabled={activeTraceIndex >= eventTrace.length - 1}
                  >
                    <SkipForward size={12} />
                  </button>

                  {/* Speed Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Speed:</span>
                    {[0.5, 1, 2, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        className={playbackSpeed === s ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={() => setPlaybackSpeed(s)}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline Scrubber Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '220px', maxWidth: '400px' }}>
                  <input
                    type="range"
                    min="0"
                    max={eventTrace.length - 1}
                    value={activeTraceIndex}
                    onChange={(e) => {
                      setActiveTraceIndex(Number(e.target.value));
                      setIsPlaying(false);
                    }}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    #{activeTraceIndex + 1}/{eventTrace.length}
                  </span>
                </div>
              </div>

              {/* Active Event Callout Inspector */}
              {currentEvent && (
                <div style={{
                  padding: '10px 14px',
                  background: '#f1f5f9',
                  borderBottom: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-blue font-mono" style={{ fontSize: '10.5px' }}>
                      Seq #{currentEvent.sequenceId}
                    </span>
                    <span className="font-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Virtual Clock t = {currentEvent.time.toFixed(3)}s
                    </span>
                    <span style={{
                      background: currentEvent.type === 'ARRIVAL' ? '#065f46' : currentEvent.type === 'DEPARTURE' ? '#1e3a8a' : '#334155',
                      color: '#ffffff',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      {currentEvent.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, flex: 1, textAlign: 'right' }}>
                    {currentEvent.description}
                  </div>
                </div>
              )}

              {/* Trace Table */}
              <div style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}>
                {filteredTrace.length === 0 ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
                    No trace events matching "{traceSearch}"
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '11px', textAlign: 'left' }}>
                        <th style={{ padding: '4px 8px', width: '55px' }}>Seq</th>
                        <th style={{ padding: '4px 8px', width: '95px' }}>Virtual t</th>
                        <th style={{ padding: '4px 8px', width: '45px' }}>Prio</th>
                        <th style={{ padding: '4px 8px', width: '140px' }}>Event Type</th>
                        <th style={{ padding: '4px 8px' }}>Action & State Transition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrace.map((ev, i) => {
                        const isCurrentActive = activeTraceIndex === i;
                        return (
                          <tr
                            key={i}
                            ref={isCurrentActive ? activeRowRef : null}
                            onClick={() => { setActiveTraceIndex(i); setIsPlaying(false); }}
                            style={{
                              borderBottom: '1px solid #1e293b',
                              background: isCurrentActive ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                              boxShadow: isCurrentActive ? 'inset 3px 0 0 #38bdf8' : 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <td style={{ padding: '4px 8px', color: isCurrentActive ? '#38bdf8' : '#64748b' }}>
                              #{ev.sequenceId}
                            </td>
                            <td style={{ padding: '4px 8px', color: isCurrentActive ? '#ffffff' : '#38bdf8', fontWeight: isCurrentActive ? 700 : 400 }}>
                              {ev.time.toFixed(3)}s
                            </td>
                            <td style={{ padding: '4px 8px', color: '#94a3b8' }}>{ev.priority}</td>
                            <td style={{ padding: '4px 8px' }}>
                              <span style={{
                                background: ev.type === 'ARRIVAL' ? '#065f46' : ev.type === 'DEPARTURE' ? '#1e3a8a' : '#334155',
                                color: '#f8fafc',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 600
                              }}>
                                {ev.type}
                              </span>
                            </td>
                            <td style={{ padding: '4px 8px', color: isCurrentActive ? '#ffffff' : '#e2e8f0', fontWeight: isCurrentActive ? 600 : 400 }}>
                              {ev.description}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        scenario={scenario}
      />
    </div>
  );
}
