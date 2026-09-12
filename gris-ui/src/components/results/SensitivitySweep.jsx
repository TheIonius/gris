import React, { useState } from 'react';
import { Sliders, Play, Download, X, AlertCircle, Info, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { runParameterSweep } from '../../api';

const PRESETS = [
  {
    id: 'mm1-lambda',
    title: 'M/M/1 Traffic Intensity Asymptotic Delay',
    modelType: 'mm1-queue',
    parameterName: 'lambda',
    parameterValues: [0.2, 0.4, 0.6, 0.75, 0.85, 0.92],
    baseParameters: { mu: 1.0, servers: 1, warmup: 1000 },
    horizon: 10000,
    replications: 8,
    seedBase: 42,
    targetMetric: 'steady.customer.system_time',
    description: 'Demonstrates the non-linear hyperbolic divergence of queue delay W = 1 / (μ - λ) as traffic intensity ρ → 1.0.',
    hasTheoretical: true,
  },
  {
    id: 'mobility-fleet',
    title: 'NYC Urban Fleet Sizing Phase Transition',
    modelType: 'mobility-dispatch',
    parameterName: 'fleetSize',
    parameterValues: [150, 250, 400, 600, 800],
    baseParameters: { policy: 'NEAREST', demandMultiplier: 1.0, maxWaitTolerance: 600 },
    horizon: 3600,
    replications: 5,
    seedBase: 42,
    targetMetric: 'passenger.wait_time',
    description: 'Illustrates the steep collapse in customer wait times when fleet capacity crosses the minimum dispatch equilibrium.',
    hasTheoretical: false,
  },
  {
    id: 'caucedo-cranes',
    title: 'DP World Caucedo STS Quay Crane Scaling',
    modelType: 'caucedo-terminal',
    parameterName: 'quayCranes',
    parameterValues: [2, 4, 6, 8, 10, 12],
    baseParameters: { berths: 3, movesPerHourPerCrane: 28.0, cranePolicy: 'DYNAMIC', arrivalRatePerDay: 4.0 },
    horizon: 604800,
    replications: 8,
    seedBase: 42,
    targetMetric: 'vessel.turnaround_hours',
    description: 'Evaluates the diminishing returns of adding quay cranes to vessel turnaround duration.',
    hasTheoretical: false,
  }
];

export function SensitivitySweep({ onClose }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [modelType, setModelType] = useState(PRESETS[0].modelType);
  const [parameterName, setParameterName] = useState(PRESETS[0].parameterName);
  const [parameterValuesStr, setParameterValuesStr] = useState(PRESETS[0].parameterValues.join(', '));
  const [targetMetric, setTargetMetric] = useState(PRESETS[0].targetMetric);
  const [horizon, setHorizon] = useState(PRESETS[0].horizon);
  const [replications, setReplications] = useState(PRESETS[0].replications);
  const [seedBase, setSeedBase] = useState(PRESETS[0].seedBase);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [sweepResult, setSweepResult] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setModelType(preset.modelType);
    setParameterName(preset.parameterName);
    setParameterValuesStr(preset.parameterValues.join(', '));
    setTargetMetric(preset.targetMetric);
    setHorizon(preset.horizon);
    setReplications(preset.replications);
    setSeedBase(preset.seedBase);
    setErrorMsg(null);
  };

  const handleLaunchSweep = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const values = parameterValuesStr
        .split(',')
        .map((v) => parseFloat(v.trim()))
        .filter((v) => !isNaN(v));

      if (values.length < 2) {
        throw new Error('Please specify at least 2 comma-separated parameter values to sweep.');
      }

      const payload = {
        name: `${modelType} Sensitivity Sweep [${parameterName}]`,
        modelType,
        parameterName,
        parameterValues: values,
        baseParameters: selectedPreset?.baseParameters || {},
        horizon: Number(horizon),
        replications: Number(replications),
        seedBase: Number(seedBase),
        targetMetric,
      };

      const result = await runParameterSweep(payload);
      setSweepResult(result);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete parameter sensitivity sweep');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!sweepResult || !sweepResult.points) return;
    const rows = [
      ['Parameter', sweepResult.parameterName, 'TargetMetric', sweepResult.targetMetric],
      ['ParameterValue', 'Replications', 'Mean', 'StdDev', 'CI95_Lower', 'CI95_Upper', 'Min', 'Max', 'TotalEvents', 'WallClockMs']
    ];

    sweepResult.points.forEach((p) => {
      rows.push([
        p.parameterValue,
        p.replications,
        p.mean,
        p.standardDeviation,
        p.ciLower,
        p.ciUpper,
        p.min,
        p.max,
        p.totalEvents,
        p.wallClockMs
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map((r) => r.join(',')).join('\n'));
    const a = document.createElement('a');
    a.setAttribute('href', csvContent);
    a.setAttribute('download', `gris_sweep_${sweepResult.modelType}_${sweepResult.parameterName}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExportExcel = () => {
    if (!sweepResult || !sweepResult.points) return;
    const data = [
      ['GRIS PARAMETER SENSITIVITY SWEEP WORKBOOK', ''],
      ['Model Type', sweepResult.modelType],
      ['Parameter', sweepResult.parameterName],
      ['Target Metric', sweepResult.targetMetric],
      ['', ''],
      ['Parameter Value', 'Replications', 'Mean Metric Value', 'Std Dev', '95% CI Lower', '95% CI Upper', 'Min Observed', 'Max Observed', 'Total Events', 'Wall Clock (ms)']
    ];

    sweepResult.points.forEach((p) => {
      data.push([
        p.parameterValue,
        p.replications,
        p.mean,
        p.standardDeviation,
        p.ciLower,
        p.ciUpper,
        p.min,
        p.max,
        p.totalEvents,
        p.wallClockMs
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sweep Curve');
    const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gris_sweep_${sweepResult.modelType}_${sweepResult.parameterName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // SVG Chart Geometry
  const renderChart = () => {
    if (!sweepResult || !sweepResult.points || sweepResult.points.length === 0) return null;

    const pts = sweepResult.points;
    const width = 720;
    const height = 260;
    const padX = 55;
    const padY = 30;

    const xVals = pts.map((p) => p.parameterValue);
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const spanX = maxX - minX > 0 ? maxX - minX : 1.0;

    const allY = pts.flatMap((p) => [p.mean, p.ciLower, p.ciUpper]);
    const minY = Math.max(0, Math.min(...allY) * 0.9);
    const maxY = Math.max(...allY) * 1.1;
    const spanY = maxY - minY > 0 ? maxY - minY : 1.0;

    const scaleX = (val) => padX + ((val - minX) / spanX) * (width - padX * 2);
    const scaleY = (val) => height - padY - ((val - minY) / spanY) * (height - padY * 2);

    // Build 95% CI polygon band
    const upperPoints = pts.map((p) => `${scaleX(p.parameterValue)},${scaleY(p.ciUpper)}`);
    const lowerPointsReversed = [...pts].reverse().map((p) => `${scaleX(p.parameterValue)},${scaleY(p.ciLower)}`);
    const polygonPath = [...upperPoints, ...lowerPointsReversed].join(' ');

    // Mean polyline
    const meanPolyline = pts.map((p) => `${scaleX(p.parameterValue)},${scaleY(p.mean)}`).join(' ');

    // Theoretical curve for M/M/1 if applicable
    let theoreticalPoints = null;
    if (sweepResult.modelType === 'mm1-queue' && sweepResult.parameterName === 'lambda') {
      const mu = Number(sweepResult.baseParameters?.mu || 1.0);
      const steps = 30;
      const tPts = [];
      for (let i = 0; i <= steps; i++) {
        const l = minX + (i / steps) * (maxX - minX);
        if (l < mu) {
          const w = 1.0 / (mu - l);
          if (w <= maxY * 1.2) {
            tPts.push(`${scaleX(l)},${scaleY(w)}`);
          }
        }
      }
      if (tPts.length > 1) {
        theoreticalPoints = tPts.join(' ');
      }
    }

    return (
      <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '16px', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
              Phase-Change Curve: {sweepResult.parameterName} vs. {sweepResult.targetMetric}
            </strong>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              N = {sweepResult.replications} replications per point · Shaded band indicates Student-t 95% Confidence Interval
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '3px', background: 'var(--text-primary)', display: 'inline-block' }} />
              <span>Empirical Mean</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '10px', background: 'rgba(56, 189, 248, 0.25)', border: '1px solid #38bdf8', display: 'inline-block' }} />
              <span>95% CI Band</span>
            </div>
            {theoreticalPoints && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #059669', display: 'inline-block' }} />
                <span style={{ color: '#059669' }}>Closed-Form W = 1/(μ-λ)</span>
              </div>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              onClick={handleExportExcel}
              title="Download Parameter Sweep Curve as Excel Workbook (.xlsx)"
            >
              <FileSpreadsheet size={11} style={{ color: '#10b981' }} />
              Export Excel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px' }}
              onClick={handleExportCsv}
            >
              <Download size={11} />
              Export CSV
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((t) => {
              const yVal = minY + t * spanY;
              const y = scaleY(yVal);
              return (
                <g key={t}>
                  <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={padX - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="monospace">
                    {yVal.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* X Axis ticks */}
            {pts.map((p, idx) => {
              const x = scaleX(p.parameterValue);
              return (
                <g key={idx}>
                  <line x1={x} y1={height - padY} x2={x} y2={height - padY + 4} stroke="#cbd5e1" />
                  <text x={x} y={height - padY + 16} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">
                    {p.parameterValue}
                  </text>
                </g>
              );
            })}

            {/* 95% CI Shaded Area */}
            <polygon points={polygonPath} fill="#e0f2fe" opacity="0.6" stroke="#bae6fd" strokeWidth="1" />

            {/* Theoretical Line if available */}
            {theoreticalPoints && (
              <polyline points={theoreticalPoints} fill="none" stroke="#059669" strokeWidth="2" strokeDasharray="4 3" />
            )}

            {/* Mean Line */}
            <polyline points={meanPolyline} fill="none" stroke="var(--text-primary)" strokeWidth="2" />

            {/* Point Markers */}
            {pts.map((p, idx) => {
              const x = scaleX(p.parameterValue);
              const y = scaleY(p.mean);
              const isHovered = hoveredPoint === idx;

              return (
                <g key={idx} onMouseEnter={() => setHoveredPoint(idx)} onMouseLeave={() => setHoveredPoint(null)}>
                  {/* CI Error bar whiskers */}
                  <line x1={x} y1={scaleY(p.ciLower)} x2={x} y2={scaleY(p.ciUpper)} stroke="#0284c7" strokeWidth="1.5" />
                  <line x1={x - 3} y1={scaleY(p.ciLower)} x2={x + 3} y2={scaleY(p.ciLower)} stroke="#0284c7" strokeWidth="1.5" />
                  <line x1={x - 3} y1={scaleY(p.ciUpper)} x2={x + 3} y2={scaleY(p.ciUpper)} stroke="#0284c7" strokeWidth="1.5" />

                  {/* Circle dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4}
                    fill="var(--text-primary)"
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover Details Card */}
          {hoveredPoint !== null && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '70px',
              background: '#0f172a',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              pointerEvents: 'none',
              fontFamily: 'monospace',
              zIndex: 10,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}>
              <div><strong>{sweepResult.parameterName}</strong> = {pts[hoveredPoint].parameterValue}</div>
              <div>Mean: <strong>{pts[hoveredPoint].mean.toFixed(4)}</strong></div>
              <div>95% CI: [{pts[hoveredPoint].ciLower.toFixed(3)} to {pts[hoveredPoint].ciUpper.toFixed(3)}]</div>
              <div>StdDev: {pts[hoveredPoint].standardDeviation.toFixed(4)}</div>
            </div>
          )}
        </div>

        {/* Sweep Table */}
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table>
            <thead>
              <tr>
                <th>{sweepResult.parameterName}</th>
                <th>Replications</th>
                <th>Mean</th>
                <th>95% Confidence Interval</th>
                <th>Std Dev</th>
                <th>Min / Max</th>
                <th>Events</th>
                <th style={{ textAlign: 'right' }}>Runtime</th>
              </tr>
            </thead>
            <tbody>
              {pts.map((p, idx) => (
                <tr key={idx} style={{ background: hoveredPoint === idx ? 'var(--bg-surface-elevated)' : 'transparent' }}>
                  <td className="font-mono"><strong>{p.parameterValue}</strong></td>
                  <td className="font-mono">{p.replications}</td>
                  <td className="font-mono" style={{ fontWeight: 600 }}>{p.mean.toFixed(4)}</td>
                  <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    [{p.ciLower.toFixed(3)} to {p.ciUpper.toFixed(3)}]
                  </td>
                  <td className="font-mono">{p.standardDeviation.toFixed(4)}</td>
                  <td className="font-mono">{p.min.toFixed(2)} / {p.max.toFixed(2)}</td>
                  <td className="font-mono">{p.totalEvents.toLocaleString()}</td>
                  <td className="font-mono" style={{ textAlign: 'right' }}>{p.wallClockMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="panel" style={{ marginBottom: '20px', border: '1px solid var(--border-active)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={15} style={{ color: 'var(--text-primary)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
            Parameter Sensitivity Sweep & Phase-Change Analysis
          </h2>
        </div>
        {onClose && (
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '12px', padding: '3px 8px' }}>
            <X size={12} />
            Close
          </button>
        )}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Executes Monte Carlo replications across an input parameter axis to reveal non-linear phase changes, critical tipping points, and asymptotic boundaries.
      </p>

      {/* Preset Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {PRESETS.map((preset) => {
          const isSelected = selectedPreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11.5px', padding: '5px 10px' }}
              onClick={() => handleSelectPreset(preset)}
            >
              {preset.title}
            </button>
          );
        })}
      </div>

      {selectedPreset && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--bg-surface-elevated)',
          borderRadius: '4px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <Info size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
          <span>{selectedPreset.description}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '8px 12px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          color: '#991b1b',
          fontSize: '12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sweep Form */}
      <form onSubmit={handleLaunchSweep}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label>Model Type</label>
            <input
              type="text"
              className="input-text font-mono"
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Sweep Parameter Name</label>
            <input
              type="text"
              className="input-text font-mono"
              value={parameterName}
              onChange={(e) => setParameterName(e.target.value)}
              required
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label>Parameter Values (Comma-Separated)</label>
            <input
              type="text"
              className="input-text font-mono"
              value={parameterValuesStr}
              onChange={(e) => setParameterValuesStr(e.target.value)}
              placeholder="0.2, 0.4, 0.6, 0.8"
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label>Target Observable Metric</label>
            <input
              type="text"
              className="input-text font-mono"
              value={targetMetric}
              onChange={(e) => setTargetMetric(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Virtual Horizon (seconds)</label>
            <input
              type="number"
              className="input-text font-mono"
              value={horizon}
              onChange={(e) => setHorizon(parseFloat(e.target.value))}
              required
            />
          </div>

          <div>
            <label>Replications / Point (N)</label>
            <input
              type="number"
              min="2"
              max="50"
              className="input-text font-mono"
              value={replications}
              onChange={(e) => setReplications(parseInt(e.target.value))}
              required
            />
          </div>

          <div>
            <label>Base Random Seed</label>
            <input
              type="number"
              className="input-text font-mono"
              value={seedBase}
              onChange={(e) => setSeedBase(parseInt(e.target.value))}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ padding: '8px 16px' }}
          >
            <Play size={13} />
            {isLoading ? 'Running Parameter Sweep...' : 'Execute Parameter Sweep'}
          </button>
        </div>
      </form>

      {/* Render Chart and Table */}
      {renderChart()}
    </div>
  );
}
