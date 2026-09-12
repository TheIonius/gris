import React, { useState, useEffect } from 'react';
import { Search, Play, SlidersHorizontal, AlertTriangle, GitCompare, ArrowRight, Sparkles, X } from 'lucide-react';
import { askScenario } from '../../api';

const GLOBAL_PRESETS = [
  { label: 'Compare: Nearest vs Batched (400 vehicles)', query: 'Compare Nearest vs Batched dispatch with 400 vehicles' },
  { label: 'Compare: 4 vs 8 Cranes (Caucedo)', query: 'Compare 4 vs 8 cranes in Caucedo terminal' },
  { label: 'Compare: Queue arrival 0.5 vs 0.8', query: 'Compare arrival rate lambda 0.5 vs 0.8' },
  { label: 'NYC Fleet: 20% drop on Friday rush', query: 'what if we lose 20% of vehicles in Brooklyn on Friday evening?' },
  { label: 'Caucedo Port: 2 cranes down (dynamic)', query: 'what if two cranes go down at Caucedo terminal?' },
  { label: 'M/M/1 Queue: arrival 0.8, service 1.0', query: 'Simulate an M/M/1 queue with arrival rate 0.8 and service rate 1.0 for 10000s with 20 replications' },
];

export function AskBar({ onApplyScenario, onExecuteParsed, onExecuteComparison, activeScenario }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [previousScenario, setPreviousScenario] = useState(null);
  const [contextOverride, setContextOverride] = useState(null); // Explicit context scenario
  const [diffDetails, setDiffDetails] = useState([]);
  const [error, setError] = useState(null);

  // Sync active scenario into context if changed externally
  useEffect(() => {
    if (activeScenario && !contextOverride) {
      setPreviousScenario(activeScenario);
    }
  }, [activeScenario]);

  const effectiveContext = contextOverride || previousScenario;

  // Contextual refinement quick chips
  const getRefinementChips = () => {
    if (!effectiveContext) return [];
    const model = effectiveContext.modelType;
    if (model === 'caucedo-terminal') {
      return [
        { label: 'Reduce to 4 cranes', query: 'what if we reduce quay cranes to 4?' },
        { label: 'Switch to FIXED crane policy', query: 'switch crane policy to FIXED_PER_BERTH' },
        { label: 'Add 4th berth', query: 'expand terminal to 4 berths' },
        { label: 'Benchmark 32 GMPH moves', query: 'increase crane productivity to 32 moves per hour' },
      ];
    } else if (model === 'mobility') {
      return [
        { label: 'Expand to 600 vehicles', query: 'now with 600 vehicles' },
        { label: 'Switch to BATCHED dispatch', query: 'switch dispatch policy to BATCHED' },
        { label: 'Enable ANTICIPATORY relocation', query: 'set relocation policy to ANTICIPATORY' },
        { label: 'Rush hour demand spike', query: 'simulate rush hour with 30% higher demand' },
      ];
    } else if (model === 'mm1-queue') {
      return [
        { label: 'Increase arrival lambda to 0.85', query: 'increase arrival rate lambda to 0.85' },
        { label: 'Add 2nd server (c=2)', query: 'add a second server to make it M/M/2' },
        { label: 'Set buffer capacity to 10', query: 'limit queue buffer capacity to 10' },
        { label: 'Extend horizon to 20,000s', query: 'simulate for 20000 seconds with 30 replications' },
      ];
    }
    return [];
  };

  const handleParse = async (queryText = prompt) => {
    const text = queryText.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setDiffDetails([]);

    try {
      let enrichedPrompt = text;
      const lower = text.toLowerCase();

      // Detect if user prompt is a refinement on active context
      const isRefinement = effectiveContext && (
        lower.startsWith('now with') ||
        lower.startsWith('what if') ||
        lower.startsWith('change') ||
        lower.startsWith('switch') ||
        lower.startsWith('set') ||
        lower.startsWith('reduce') ||
        lower.startsWith('increase') ||
        lower.startsWith('add') ||
        lower.startsWith('expand') ||
        (!lower.includes('caucedo') && !lower.includes('terminal') &&
         !lower.includes('mobility') && !lower.includes('taxi') &&
         !lower.includes('queue') && !lower.includes('mm1') && !lower.includes('m/m/1'))
      );

      if (isRefinement && effectiveContext) {
        // Enrich prompt with model context keyword if needed
        const domainPrefix = effectiveContext.modelType === 'caucedo-terminal'
          ? 'Caucedo terminal: '
          : effectiveContext.modelType === 'mobility'
          ? 'NYC mobility dispatch: '
          : 'M/M/1 queue: ';
        enrichedPrompt = `${domainPrefix} ${text}`;
      }

      const res = await askScenario(enrichedPrompt, false);

      // If single scenario and we have prior context, merge unmodified parameters and compute diff
      if (!res.isComparison && effectiveContext && effectiveContext.parameters) {
        const priorParams = effectiveContext.parameters;
        const newParams = { ...res.parameters };
        const merged = { ...priorParams, ...newParams };
        
        // Compute diff
        const diffs = [];
        Object.keys(merged).forEach(k => {
          if (priorParams[k] !== undefined && newParams[k] !== undefined && String(priorParams[k]) !== String(newParams[k])) {
            diffs.push({ key: k, oldVal: priorParams[k], newVal: newParams[k] });
          } else if (priorParams[k] === undefined && newParams[k] !== undefined) {
            diffs.push({ key: k, oldVal: 'default', newVal: newParams[k] });
          }
        });

        res.parameters = merged;
        setDiffDetails(diffs);
      }

      setParseResult(res);
      setPreviousScenario(res);
    } catch (err) {
      setError(err.message || 'Failed to parse natural language inquiry');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteNow = () => {
    if (!parseResult) return;
    if (parseResult.isComparison && onExecuteComparison) {
      onExecuteComparison(parseResult);
    } else {
      onExecuteParsed(parseResult);
    }
  };

  const handleFillForm = (target = parseResult) => {
    if (!target) return;
    onApplyScenario(target);
  };

  const clearContext = () => {
    setPreviousScenario(null);
    setContextOverride(null);
    setDiffDetails([]);
  };

  const refinementChips = getRefinementChips();

  return (
    <div className="panel" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
            Natural-Language Simulation Copilot
          </h2>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Stateful multi-turn parameter refinement and dual-policy comparisons
        </span>
      </div>

      {/* Multi-turn Context Banner */}
      {effectiveContext && (
        <div style={{
          marginBottom: '10px',
          padding: '6px 10px',
          background: '#f1f5f9',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} style={{ color: '#0284c7' }} />
            <span style={{ color: 'var(--text-muted)' }}>Active Refinement Context:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {effectiveContext.suggestedName || effectiveContext.name || effectiveContext.modelType}
            </strong>
            <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
              ({effectiveContext.modelType})
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            title="Clear context for a fresh prompt"
            style={{ padding: '1px 6px', fontSize: '10.5px' }}
            onClick={clearContext}
          >
            <X size={11} />
            Reset Context
          </button>
        </div>
      )}

      {/* Input Field */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          type="text"
          className="input-text"
          placeholder={
            effectiveContext
              ? `Refine active scenario: e.g. "now with 600 vehicles" or "what if 4 cranes instead of 8?"`
              : `Describe a scenario or comparison: e.g. "Compare Nearest vs Batched dispatch with 400 vehicles"`
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleParse()}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleParse()}
          disabled={loading || !prompt.trim()}
        >
          {loading ? 'Translating...' : effectiveContext ? 'Refine Model' : 'Parse Query'}
        </button>
      </div>

      {/* Contextual Refinement Chips or Global Preset Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginRight: '2px' }}>
          {refinementChips.length > 0 ? 'Refinements:' : 'Examples:'}
        </span>
        {(refinementChips.length > 0 ? refinementChips : GLOBAL_PRESETS).map((chip, idx) => (
          <button
            key={idx}
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', padding: '3px 8px' }}
            onClick={() => {
              setPrompt(chip.query);
              handleParse(chip.query);
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          color: '#991b1b',
          fontSize: '12.5px'
        }}>
          {error}
        </div>
      )}

      {/* Confirmation Contract Card (Comparison vs Single) */}
      {parseResult && parseResult.isComparison ? (
        <div style={{
          marginTop: '14px',
          padding: '14px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <GitCompare size={12} />
                Policy Comparison Contract
              </span>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                {parseResult.suggestedName}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Confidence:</span>
              <span className="badge badge-blue font-mono">
                {Math.round(parseResult.confidence * 100)}%
              </span>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {parseResult.reasoning || parseResult.description}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '12px'
          }}>
            {/* Branch A */}
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              padding: '12px',
              borderRadius: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="badge badge-blue" style={{ fontSize: '11px' }}>Scenario A (Baseline)</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {parseResult.comparisonA?.replications} reps | {parseResult.comparisonA?.horizon}s
                </span>
              </div>
              <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                {parseResult.comparisonA?.suggestedName}
              </strong>
              <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {Object.entries(parseResult.comparisonA?.parameters || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '2px 6px' }}
                onClick={() => handleFillForm(parseResult.comparisonA)}
              >
                Open A in Form
              </button>
            </div>

            {/* Branch B */}
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              padding: '12px',
              borderRadius: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="badge badge-purple" style={{ fontSize: '11px' }}>Scenario B (Variation)</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {parseResult.comparisonB?.replications} reps | {parseResult.comparisonB?.horizon}s
                </span>
              </div>
              <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                {parseResult.comparisonB?.suggestedName}
              </strong>
              <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {Object.entries(parseResult.comparisonB?.parameters || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '2px 6px' }}
                onClick={() => handleFillForm(parseResult.comparisonB)}
              >
                Open B in Form
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleExecuteNow} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <GitCompare size={14} />
              Launch Policy Comparison (Run Both)
            </button>
          </div>
        </div>
      ) : parseResult ? (
        <div style={{
          marginTop: '14px',
          padding: '14px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-emerald">Confirmation Contract</span>
              <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                {parseResult.suggestedName}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Confidence:</span>
              <span className="badge badge-blue font-mono">
                {Math.round(parseResult.confidence * 100)}%
              </span>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {parseResult.description}
          </p>

          {/* Diff Callout if multi-turn refinement occurred */}
          {diffDetails.length > 0 && (
            <div style={{
              marginBottom: '10px',
              padding: '8px 12px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <strong style={{ color: '#065f46', display: 'block', marginBottom: '4px' }}>
                Refinement Applied from Baseline Scenario:
              </strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {diffDetails.map((d, i) => (
                  <span key={i} className="badge badge-emerald font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>{d.key}:</span>
                    <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{String(d.oldVal)}</span>
                    <ArrowRight size={10} />
                    <strong>{String(d.newVal)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            marginBottom: '10px',
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            padding: '10px',
            borderRadius: '4px'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Model</span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {parseResult.modelType}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Horizon / Duration</span>
              <div className="font-mono" style={{ fontSize: '13px', fontWeight: 500 }}>
                {parseResult.horizon}s ({(parseResult.horizon / 3600).toFixed(1)} hrs)
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Replications</span>
              <div className="font-mono" style={{ fontSize: '13px', fontWeight: 500 }}>
                {parseResult.replications} runs (95% CI)
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Parameters</span>
              <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {Object.entries(parseResult.parameters || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
              </div>
            </div>
          </div>

          {parseResult.reasoning && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Deduction:</span> {parseResult.reasoning}
            </div>
          )}

          {parseResult.warnings && parseResult.warnings.length > 0 && (
            <div style={{
              marginBottom: '10px',
              padding: '8px 10px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '4px'
            }}>
              {parseResult.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={12} />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => handleFillForm(parseResult)}>
              <SlidersHorizontal size={13} />
              Open in Parameter Form
            </button>
            <button className="btn btn-primary" onClick={handleExecuteNow}>
              <Play size={13} />
              Run Monte Carlo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
