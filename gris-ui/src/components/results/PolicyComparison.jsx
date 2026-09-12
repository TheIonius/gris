import React, { useState } from 'react';
import { GitCompare, X, CheckCircle2, HelpCircle, ShieldCheck, ArrowRight, Layers } from 'lucide-react';

const T_CRIT_95_TABLE = [
  NaN,
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
  2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
  2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042,
  2.040, 2.037, 2.035, 2.032, 2.030, 2.028, 2.026, 2.024, 2.023, 2.021,
  2.020, 2.018, 2.017, 2.015, 2.014, 2.013, 2.012, 2.011, 2.010, 2.009,
  2.008, 2.007, 2.006, 2.005, 2.004, 2.003, 2.002, 2.002, 2.001, 2.000,
  2.000, 1.999, 1.998, 1.998, 1.997, 1.997, 1.996, 1.995, 1.995, 1.994,
  1.994, 1.993, 1.993, 1.993, 1.992, 1.992, 1.991, 1.991, 1.990, 1.990,
  1.990, 1.989, 1.989, 1.989, 1.988, 1.988, 1.988, 1.987, 1.987, 1.987,
  1.986, 1.986, 1.986, 1.985, 1.985, 1.985, 1.984, 1.984, 1.984, 1.984,
  1.984, 1.983, 1.983, 1.983, 1.983, 1.982, 1.982, 1.982, 1.982, 1.982,
  1.981, 1.981, 1.981, 1.981, 1.981, 1.980, 1.980, 1.980, 1.980, 1.980
];

function getCriticalValue95(df) {
  if (df < 1) return 1.96;
  if (df < T_CRIT_95_TABLE.length) {
    return T_CRIT_95_TABLE[df];
  }
  const z = 1.959963984540054;
  const z3 = z * z * z;
  const z5 = z3 * z * z;
  const invDf = 1.0 / df;
  const invDf2 = invDf * invDf;
  return z + (z3 + z) * (invDf / 4.0) + (5.0 * z5 + 16.0 * z3 + 3.0 * z) * (invDf2 / 96.0);
}

function computePairedDifference(valsA = [], valsB = [], varA = 0, varB = 0) {
  if (!valsA.length || !valsB.length || valsA.length !== valsB.length || valsA.length < 2) {
    return null;
  }
  const n = valsA.length;
  const diffs = [];
  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    const d = valsB[i] - valsA[i];
    diffs.push(d);
    sumDiff += d;
  }
  const meanDiff = sumDiff / n;

  let sumSqDiff = 0;
  for (let i = 0; i < n; i++) {
    sumSqDiff += Math.pow(diffs[i] - meanDiff, 2);
  }
  const varDiff = sumSqDiff / (n - 1);
  const seDiff = Math.sqrt(varDiff / n);
  const tCrit = getCriticalValue95(n - 1);
  const halfWidth = tCrit * seDiff;

  const lowerDiff = meanDiff - halfWidth;
  const upperDiff = meanDiff + halfWidth;
  const isSignificant = (lowerDiff > 0 && upperDiff > 0) || (lowerDiff < 0 && upperDiff < 0);

  // Common Random Numbers (CRN) Variance Reduction
  const varIndep = varA + varB;
  const varReductionPct = varIndep > 0 ? Math.max(0, ((varIndep - varDiff) / varIndep) * 100) : 0;
  const cov = 0.5 * (varIndep - varDiff);
  const stdA = Math.sqrt(varA);
  const stdB = Math.sqrt(varB);
  const correlation = (stdA > 0 && stdB > 0) ? Math.max(-1, Math.min(1, cov / (stdA * stdB))) : 0;

  return {
    meanDiff,
    lowerDiff,
    upperDiff,
    halfWidth,
    isSignificant,
    varReductionPct,
    correlation,
    replications: n
  };
}

export function PolicyComparison({ scenarioA, scenarioB, scenarios = [], onSelectPair, onClear, onGoToStudio }) {
  const [pickA, setPickA] = useState(scenarioA?.id || '');
  const [pickB, setPickB] = useState(scenarioB?.id || '');

  const completedScenarios = scenarios.filter((s) => s.status === 'COMPLETED');

  // If either scenario is missing, show the selection picker
  if (!scenarioA || !scenarioB) {
    const handleLaunchComparison = () => {
      const foundA = completedScenarios.find((s) => s.id === pickA);
      const foundB = completedScenarios.find((s) => s.id === pickB);
      if (foundA && foundB && onSelectPair) {
        onSelectPair(foundA, foundB);
      }
    };

    return (
      <div className="panel" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <GitCompare size={16} style={{ color: 'var(--text-primary)' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>
            Policy Comparison & Statistical Delta Analysis
          </h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Compare two simulation runs side-by-side with paired-t hypothesis testing and Common Random Numbers (CRN) variance reduction verification.
        </p>

        {completedScenarios.length < 2 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '6px'
          }}>
            <Layers size={28} style={{ color: '#94a3b8', margin: '0 auto 8px auto', display: 'block' }} />
            <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              At Least Two Completed Runs Required
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 14px auto' }}>
              To compute paired statistical differences, execute at least two scenarios or launch a dual comparison via the Natural Language Copilot.
            </p>
            {onGoToStudio && (
              <button className="btn btn-primary" onClick={onGoToStudio}>
                Go to Workbench & Launch Run
              </button>
            )}
          </div>
        ) : (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '16px',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label>Baseline Scenario (A)</label>
                <select
                  className="select-input font-mono"
                  value={pickA}
                  onChange={(e) => setPickA(e.target.value)}
                >
                  <option value="">Select baseline scenario...</option>
                  {completedScenarios.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id === pickB}>
                      {s.name} ({s.modelType}, {s.replications} reps)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Policy Variation (B)</label>
                <select
                  className="select-input font-mono"
                  value={pickB}
                  onChange={(e) => setPickB(e.target.value)}
                >
                  <option value="">Select policy variation...</option>
                  {completedScenarios.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id === pickA}>
                      {s.name} ({s.modelType}, {s.replications} reps)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLaunchComparison}
                disabled={!pickA || !pickB || pickA === pickB}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <GitCompare size={14} />
                <span>Evaluate Statistical Differences</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const resultsA = scenarioA.results || {};
  const resultsB = scenarioB.results || {};

  const sampleKeys = Array.from(new Set([
    ...Object.keys(resultsA.sampleMetrics || {}),
    ...Object.keys(resultsB.sampleMetrics || {}),
  ]));

  const twKeys = Array.from(new Set([
    ...Object.keys(resultsA.timeWeightedMetrics || {}),
    ...Object.keys(resultsB.timeWeightedMetrics || {}),
  ]));

  // Calculate CRN average variance reduction across sample metrics
  const crnReductions = [];
  sampleKeys.forEach((k) => {
    const mA = resultsA.sampleMetrics?.[k];
    const mB = resultsB.sampleMetrics?.[k];
    if (mA && mB) {
      const stats = computePairedDifference(mA.replicationValues, mB.replicationValues, mA.variance, mB.variance);
      if (stats && stats.varReductionPct > 0) {
        crnReductions.push(stats.varReductionPct);
      }
    }
  });
  const avgCrnReduction = crnReductions.length > 0
    ? crnReductions.reduce((a, b) => a + b, 0) / crnReductions.length
    : null;

  return (
    <div className="panel" style={{ marginBottom: '20px', border: '1px solid var(--border-active)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitCompare size={15} style={{ color: 'var(--text-primary)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
            Policy Comparison: {scenarioA.name} vs. {scenarioB.name}
          </h2>
          <span className="badge badge-purple" style={{ fontSize: '11px' }}>
            Paired-t Hypothesis Test (α = 0.05)
          </span>
        </div>
        <button className="btn btn-secondary" onClick={onClear} style={{ fontSize: '12px', padding: '3px 8px' }}>
          <X size={12} />
          Change Comparison
        </button>
      </div>

      {/* Baseline vs Variation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div className="panel-elevated">
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Baseline Run (A)
          </span>
          <div style={{ fontSize: '13.5px', fontWeight: 600, margin: '2px 0', color: 'var(--text-primary)' }}>
            {scenarioA.name}
          </div>
          <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Model: {scenarioA.modelType} | Reps: {scenarioA.replications} | Horizon: {scenarioA.horizon}s
          </div>
        </div>

        <div className="panel-elevated">
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Policy Variation (B)
          </span>
          <div style={{ fontSize: '13.5px', fontWeight: 600, margin: '2px 0', color: 'var(--text-primary)' }}>
            {scenarioB.name}
          </div>
          <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Model: {scenarioB.modelType} | Reps: {scenarioB.replications} | Horizon: {scenarioB.horizon}s
          </div>
        </div>
      </div>

      {/* CRN Statistical Rigor Banner */}
      {avgCrnReduction !== null && (
        <div style={{
          marginBottom: '14px',
          padding: '10px 14px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} style={{ color: '#166534' }} />
            <div>
              <strong style={{ fontSize: '12.5px', color: '#166534' }}>
                Common Random Numbers (CRN) Stream Synchronization Active
              </strong>
              <div style={{ fontSize: '11.5px', color: '#15803d' }}>
                Replication-by-replication pairing eliminated ~{avgCrnReduction.toFixed(1)}% of experimental variance by controlling random seed paths.
              </div>
            </div>
          </div>
          <span className="badge badge-emerald font-mono" style={{ fontSize: '11px' }}>
            CRN Variance Reduction: {avgCrnReduction.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Input Parameter Configuration Delta Matrix */}
      {(() => {
        const paramsA = scenarioA.parameters || {};
        const paramsB = scenarioB.parameters || {};
        const allParams = Array.from(new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]));
        const diffParams = allParams.filter(p => JSON.stringify(paramsA[p]) !== JSON.stringify(paramsB[p]));

        if (diffParams.length === 0) return null;

        return (
          <div style={{ marginBottom: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={13} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Configuration Inputs Delta ({diffParams.length} parameters altered)
                </span>
              </div>
              <span className="badge badge-neutral font-mono" style={{ fontSize: '10.5px' }}>
                Δ Experimental Factors
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
              {diffParams.map(paramKey => {
                const valA = paramsA[paramKey];
                const valB = paramsB[paramKey];
                const isNumeric = typeof valA === 'number' && typeof valB === 'number';
                let pctShift = null;
                if (isNumeric && valA !== 0) {
                  pctShift = ((valB - valA) / Math.abs(valA)) * 100;
                }

                return (
                  <div key={paramKey} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 10px' }}>
                    <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      {paramKey}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="font-mono" style={{ fontSize: '12.5px', color: '#64748b' }}>
                        {String(valA ?? '-')}
                      </span>
                      <ArrowRight size={11} style={{ color: '#94a3b8' }} />
                      <span className="font-mono" style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                        {String(valB ?? '-')}
                      </span>
                      {pctShift !== null && (
                        <span className={`badge ${pctShift > 0 ? 'badge-blue' : 'badge-neutral'} font-mono`} style={{ fontSize: '10px' }}>
                          {pctShift > 0 ? `+${pctShift.toFixed(1)}%` : `${pctShift.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Sample Metrics Comparison Table */}
      <h3 style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '8px' }}>
        Sample Metrics Paired Difference Analysis
      </h3>
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Baseline (A) [95% CI]</th>
              <th>Variation (B) [95% CI]</th>
              <th>Paired Delta (B - A)</th>
              <th>Relative Shift</th>
              <th>Paired 95% CI of Diff</th>
              <th>Statistical Significance</th>
              <th>Variance Reduction</th>
            </tr>
          </thead>
          <tbody>
            {sampleKeys.map((k) => {
              const mA = resultsA.sampleMetrics?.[k];
              const mB = resultsB.sampleMetrics?.[k];
              if (!mA || !mB) return null;

              const paired = computePairedDifference(mA.replicationValues, mB.replicationValues, mA.variance, mB.variance);
              const delta = paired ? paired.meanDiff : (mB.mean - mA.mean);
              const relShiftPct = mA.mean !== 0 ? ((mB.mean - mA.mean) / Math.abs(mA.mean)) * 100 : 0;
              const isWaitOrDelay = k.includes('wait') || k.includes('duration') || k.includes('delay') || k.includes('queue') || k.includes('unfulfilled');
              const isFavorable = isWaitOrDelay ? delta < 0 : delta > 0;

              return (
                <tr key={k}>
                  <td style={{ fontWeight: 500 }}>
                    <code className="font-mono">{k}</code>
                  </td>
                  <td className="font-mono">
                    {mA.mean.toFixed(3)} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>[{mA.confidenceInterval95Lower.toFixed(2)} - {mA.confidenceInterval95Upper.toFixed(2)}]</span>
                  </td>
                  <td className="font-mono">
                    {mB.mean.toFixed(3)} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>[{mB.confidenceInterval95Lower.toFixed(2)} - {mB.confidenceInterval95Upper.toFixed(2)}]</span>
                  </td>
                  <td className="font-mono" style={{ color: delta < 0 ? '#065f46' : delta > 0 ? '#991b1b' : 'var(--text-primary)' }}>
                    {delta > 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)}
                  </td>
                  <td>
                    <span
                      className="font-mono badge"
                      style={{
                        fontSize: '10.5px',
                        background: isFavorable ? '#ecfdf5' : '#fef2f2',
                        color: isFavorable ? '#065f46' : '#991b1b',
                        border: `1px solid ${isFavorable ? '#a7f3d0' : '#fecaca'}`
                      }}
                    >
                      {relShiftPct > 0 ? `+${relShiftPct.toFixed(1)}%` : `${relShiftPct.toFixed(1)}%`}
                    </span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '11.5px' }}>
                    {paired ? (
                      <span>[{paired.lowerDiff.toFixed(3)} to {paired.upperDiff.toFixed(3)}]</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {paired ? (
                      paired.isSignificant ? (
                        <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={11} />
                          Significant (p &lt; 0.05)
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <HelpCircle size={11} />
                          Inconclusive (Spans 0)
                        </span>
                      )
                    ) : (
                      <span className="badge badge-neutral">Single Run</span>
                    )}
                  </td>
                  <td className="font-mono" style={{ fontSize: '11.5px' }}>
                    {paired && paired.varReductionPct > 0 ? (
                      <span style={{ color: '#065f46', fontWeight: 500 }}>
                        -{paired.varReductionPct.toFixed(1)}% (ρ={paired.correlation.toFixed(2)})
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Time-Weighted Utilization Comparison */}
      {twKeys.length > 0 && (
        <>
          <h3 style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '8px' }}>
            Time-Weighted Resource Utilization Comparison
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Resource Metric</th>
                  <th>Baseline (A) Mean</th>
                  <th>Variation (B) Mean</th>
                  <th>Delta (B - A)</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {twKeys.map((k) => {
                  const mA = resultsA.timeWeightedMetrics?.[k];
                  const mB = resultsB.timeWeightedMetrics?.[k];
                  if (!mA || !mB) return null;

                  const delta = (mB.mean - mA.mean) * 100;
                  return (
                    <tr key={k}>
                      <td style={{ fontWeight: 500 }}>
                        <code className="font-mono">{k}</code>
                      </td>
                      <td className="font-mono">
                        {(mA.mean * 100).toFixed(1)}%
                      </td>
                      <td className="font-mono">
                        {(mB.mean * 100).toFixed(1)}%
                      </td>
                      <td className="font-mono" style={{ color: delta >= 0 ? '#065f46' : '#991b1b' }}>
                        {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {Math.abs(delta).toFixed(1)} pts {delta > 0 ? 'higher' : 'lower'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
