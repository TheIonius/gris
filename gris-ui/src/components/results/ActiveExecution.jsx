import React, { useEffect, useState } from 'react';
import { Loader2, Clock, Square } from 'lucide-react';

export function ActiveExecution({ scenario, comparison, onAbort }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 100) / 10);
    }, 100);
    return () => clearInterval(interval);
  }, [scenario?.id, comparison?.scenarioA?.id]);

  if (!scenario && !comparison) return null;

  if (comparison) {
    const sA = comparison.scenarioA || {};
    const sB = comparison.scenarioB || {};
    const pA = sA.progress || { completed: 0, total: sA.replications || 10 };
    const pB = sB.progress || { completed: 0, total: sB.replications || 10 };
    const pctA = Math.min(100, Math.max(0, pA.total > 0 ? (pA.completed / pA.total) * 100 : 0));
    const pctB = Math.min(100, Math.max(0, pB.total > 0 ? (pB.completed / pB.total) * 100 : 0));

    return (
      <div className="panel" style={{
        marginBottom: '20px',
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-primary)' }} />
            <span className="badge badge-purple">
              Running Dual Policy Comparison
            </span>
            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
              {comparison.title || 'Simultaneous Policy Simulation'}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <Clock size={13} />
              <span>Elapsed: {elapsed.toFixed(1)}s</span>
            </div>
            {onAbort && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (comparison.scenarioA?.id) onAbort(comparison.scenarioA.id);
                  if (comparison.scenarioB?.id) onAbort(comparison.scenarioB.id);
                }}
                style={{ fontSize: '11.5px', padding: '3px 8px', color: '#991b1b', borderColor: '#fecaca', background: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Abort both simulations"
              >
                <Square size={11} fill="#991b1b" />
                Abort Runs
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '10px' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Branch A: {sA.name || 'Scenario A'}
              </span>
              <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {pA.completed} / {pA.total} reps ({Math.round(pctA)}%)
              </span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pctA}%`, background: 'var(--accent-primary)', transition: 'width 0.2s ease-in-out' }} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Branch B: {sB.name || 'Scenario B'}
              </span>
              <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {pB.completed} / {pB.total} reps ({Math.round(pctB)}%)
              </span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pctB}%`, background: '#7c3aed', transition: 'width 0.2s ease-in-out' }} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Live SSE event streaming active</span>
          <span>Side-by-side policy diff will auto-mount once both runs complete</span>
        </div>
      </div>
    );
  }

  const progress = scenario.progress || {
    completed: 0,
    total: scenario.replications,
    percent: 0,
  };
  const pct = Math.min(100, Math.max(0, progress.percent || (progress.total > 0 ? (progress.completed / progress.total) * 100 : 0)));

  return (
    <div className="panel" style={{
      marginBottom: '20px',
      background: '#f8fafc',
      border: '1px solid #cbd5e1',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-primary)' }} />
          <span className="badge badge-blue">
            Running Replications
          </span>
          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
            {scenario.name}
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <Clock size={13} />
            <span>Elapsed: {elapsed.toFixed(1)}s</span>
          </div>
          {onAbort && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onAbort(scenario.id)}
              style={{ fontSize: '11.5px', padding: '3px 8px', color: '#991b1b', borderColor: '#fecaca', background: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Abort simulation execution immediately"
            >
              <Square size={11} fill="#991b1b" />
              Abort Run
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Monte Carlo parallel execution with master seed {scenario.seedBase || scenario.seed || 42}.
        </p>
        <span className="font-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {progress.completed} / {progress.total} replications ({Math.round(pct)}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '6px',
        background: '#e2e8f0',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'var(--text-primary)',
          borderRadius: '3px',
          transition: 'width 0.2s ease-in-out'
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
        <span>ID: <code className="font-mono">{scenario.id}</code></span>
        <span>Horizon: {scenario.horizon}s</span>
        <span>Replications: {scenario.replications}</span>
      </div>
    </div>
  );
}
