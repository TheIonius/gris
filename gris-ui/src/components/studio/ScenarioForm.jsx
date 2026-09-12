import React, { useState, useEffect, useRef } from 'react';
import { Play, Download, Upload, Sliders, CheckCircle2 } from 'lucide-react';
import { ImportModal } from '../modals/ImportModal';

const PRESETS = {
  'mm1-queue': [
    {
      id: 'mm1-default',
      label: 'Default Baseline (λ=0.5, μ=1.0)',
      description: 'Single server in comfortable equilibrium (ρ = 50%). Low queue wait time.',
      name: 'M/M/1 Analytical Convergence Test',
      horizon: 15000,
      replications: 20,
      seed: 42,
      params: { lambda: 0.5, mu: 1.0, servers: 1, warmup: 1000 }
    },
    {
      id: 'mm1-heavy',
      label: 'Heavy Traffic (λ=0.85, μ=1.0)',
      description: 'Server utilization at 85%. Non-linear queue buildup and high delay variance.',
      name: 'M/M/1 Heavy Traffic Congestion Test',
      horizon: 25000,
      replications: 25,
      seed: 101,
      params: { lambda: 0.85, mu: 1.0, servers: 1, warmup: 2000 }
    },
    {
      id: 'mm2-multi',
      label: 'Multi-Server M/M/2 (c=2, λ=1.4)',
      description: 'Two parallel servers sharing a single FIFO buffer (ρ = 70%). High throughput.',
      name: 'M/M/2 Parallel Server Balanced Run',
      horizon: 20000,
      replications: 20,
      seed: 202,
      params: { lambda: 1.4, mu: 1.0, servers: 2, warmup: 1000 }
    },
    {
      id: 'mm1-unstable',
      label: 'Supercritical (λ=1.2, μ=1.0)',
      description: 'Arrivals exceed service capacity (ρ = 120%). Queue grows without bound.',
      name: 'M/M/1 Supercritical Ergodicity Breakdown',
      horizon: 6000,
      replications: 10,
      seed: 303,
      params: { lambda: 1.2, mu: 1.0, servers: 1, warmup: 0 }
    }
  ],
  'mobility-dispatch': [
    {
      id: 'mob-standard',
      label: 'Standard Fleet (400 Cabs, Greedy)',
      description: 'Nearest-vehicle dispatch across Manhattan, Brooklyn, and Queens taxi hubs.',
      name: 'NYC Urban Fleet Dispatch - Nearest Policy',
      horizon: 7200,
      replications: 10,
      seed: 42,
      params: { fleetSize: 400, policy: 'NEAREST', batchWindowSeconds: 20, demandMultiplier: 1.0, maxWaitTolerance: 600 }
    },
    {
      id: 'mob-batched',
      label: 'Batched Optimization (400 Cabs)',
      description: '20-second batch matching buffer maximizing spatial pickup efficiency.',
      name: 'NYC Urban Fleet Dispatch - Batched Optimization',
      horizon: 7200,
      replications: 10,
      seed: 42,
      params: { fleetSize: 400, policy: 'BATCHED', batchWindowSeconds: 20, demandMultiplier: 1.0, maxWaitTolerance: 600 }
    },
    {
      id: 'mob-rush',
      label: 'Friday Rush Surge (500 Cabs, 1.5x)',
      description: '50% higher passenger demand with 500 cabs to test supply elasticity.',
      name: 'NYC Friday Rush Hour Surge Analysis',
      horizon: 10800,
      replications: 12,
      seed: 505,
      params: { fleetSize: 500, policy: 'BATCHED', batchWindowSeconds: 25, demandMultiplier: 1.5, maxWaitTolerance: 720 }
    },
    {
      id: 'mob-shortage',
      label: 'Severe Fleet Shortage (200 Cabs)',
      description: 'Constrained supply causing high wait times and passenger reneging.',
      name: 'NYC Fleet Deficit Stress Test',
      horizon: 7200,
      replications: 10,
      seed: 606,
      params: { fleetSize: 200, policy: 'NEAREST', batchWindowSeconds: 20, demandMultiplier: 1.2, maxWaitTolerance: 500 }
    }
  ],
  'caucedo-terminal': [
    {
      id: 'term-dynamic',
      label: 'Nominal Port (3 Berths, 8 Cranes, Dynamic)',
      description: 'Dynamic quay crane allocation matching vessel size for optimal turnaround.',
      name: 'DP World Caucedo - Dynamic Allocation Baseline',
      horizon: 604800,
      replications: 15,
      seed: 42,
      params: { berths: 3, quayCranes: 8, movesPerHourPerCrane: 28.0, cranePolicy: 'DYNAMIC', arrivalRatePerDay: 4.0 }
    },
    {
      id: 'term-fixed',
      label: 'Fixed Allocation (3 Berths, 6 Cranes, Static)',
      description: 'Strict 2 cranes per berth policy regardless of vessel TEU container count.',
      name: 'DP World Caucedo - Fixed Crane Policy',
      horizon: 604800,
      replications: 15,
      seed: 42,
      params: { berths: 3, quayCranes: 6, movesPerHourPerCrane: 28.0, cranePolicy: 'STATIC', arrivalRatePerDay: 4.0 }
    },
    {
      id: 'term-expanded',
      label: 'High Throughput (4 Berths, 12 Cranes)',
      description: 'Expanded terminal infrastructure benchmarked at high crane productivity.',
      name: 'DP World Caucedo - Expanded Berth Capacity',
      horizon: 604800,
      replications: 15,
      seed: 707,
      params: { berths: 4, quayCranes: 12, movesPerHourPerCrane: 32.0, cranePolicy: 'DYNAMIC', arrivalRatePerDay: 6.0 }
    },
    {
      id: 'term-bottleneck',
      label: 'Crane Maintenance (3 Berths, 4 Cranes)',
      description: 'Half of STS cranes out of service, causing severe vessel anchorage queues.',
      name: 'DP World Caucedo - Crane Outage Scenario',
      horizon: 604800,
      replications: 10,
      seed: 808,
      params: { berths: 3, quayCranes: 4, movesPerHourPerCrane: 26.0, cranePolicy: 'DYNAMIC', arrivalRatePerDay: 4.5 }
    }
  ]
};

export function ScenarioForm({ activeModel, initialParams, onSubmit, isRunning, onSelectModel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState(3600);
  const [replications, setReplications] = useState(15);
  const [seed, setSeed] = useState(42);
  const [activePresetId, setActivePresetId] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importAlert, setImportAlert] = useState(null);
  const fileInputRef = useRef(null);

  // M/M/1
  const [lambda, setLambda] = useState(0.5);
  const [mu, setMu] = useState(1.0);
  const [servers, setServers] = useState(1);
  const [warmup, setWarmup] = useState(1000);

  // Mobility
  const [fleetSize, setFleetSize] = useState(400);
  const [policy, setPolicy] = useState('NEAREST');
  const [batchWindowSeconds, setBatchWindowSeconds] = useState(20);
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [maxWaitTolerance, setMaxWaitTolerance] = useState(600);

  // Terminal
  const [berths, setBerths] = useState(3);
  const [quayCranes, setQuayCranes] = useState(8);
  const [movesPerHourPerCrane, setMovesPerHourPerCrane] = useState(28.0);
  const [cranePolicy, setCranePolicy] = useState('DYNAMIC');
  const [arrivalRatePerDay, setArrivalRatePerDay] = useState(4.0);

  const applyPreset = (preset) => {
    setActivePresetId(preset.id);
    setName(preset.name);
    setDescription(preset.description);
    setHorizon(preset.horizon);
    setReplications(preset.replications);
    setSeed(preset.seed);

    const p = preset.params;
    if (activeModel === 'mm1-queue') {
      setLambda(p.lambda);
      setMu(p.mu);
      setServers(p.servers);
      setWarmup(p.warmup);
    } else if (activeModel === 'mobility-dispatch') {
      setFleetSize(p.fleetSize);
      setPolicy(p.policy);
      setBatchWindowSeconds(p.batchWindowSeconds);
      setDemandMultiplier(p.demandMultiplier);
      setMaxWaitTolerance(p.maxWaitTolerance);
    } else if (activeModel === 'caucedo-terminal') {
      setBerths(p.berths);
      setQuayCranes(p.quayCranes);
      setMovesPerHourPerCrane(p.movesPerHourPerCrane);
      setCranePolicy(p.cranePolicy);
      setArrivalRatePerDay(p.arrivalRatePerDay);
    }
  };

  // Load default preset on model switch
  useEffect(() => {
    const modelPresets = PRESETS[activeModel] || [];
    if (modelPresets.length > 0) {
      applyPreset(modelPresets[0]);
    }
  }, [activeModel]);

  // Apply incoming NL-parsed parameters
  useEffect(() => {
    if (!initialParams) return;
    if (initialParams.name) setName(initialParams.name);
    else if (initialParams.suggestedName) setName(initialParams.suggestedName);

    if (initialParams.description != null) setDescription(initialParams.description);
    if (initialParams.horizon != null) setHorizon(initialParams.horizon);
    if (initialParams.replications != null) setReplications(initialParams.replications);
    if (initialParams.seed != null) setSeed(initialParams.seed);
    else if (initialParams.seedBase != null) setSeed(initialParams.seedBase);

    if (initialParams.parameters) {
      const p = initialParams.parameters;
      if (activeModel === 'mm1-queue') {
        if (p.lambda != null) setLambda(Number(p.lambda));
        if (p.mu != null) setMu(Number(p.mu));
        if (p.servers != null) setServers(Number(p.servers));
        if (p.warmup != null) setWarmup(Number(p.warmup));
      } else if (activeModel === 'mobility-dispatch') {
        if (p.fleetSize != null) setFleetSize(Number(p.fleetSize));
        if (p.policy != null) setPolicy(p.policy);
        if (p.batchWindowSeconds != null) setBatchWindowSeconds(Number(p.batchWindowSeconds));
        if (p.demandMultiplier != null) setDemandMultiplier(Number(p.demandMultiplier));
        if (p.maxWaitTolerance != null) setMaxWaitTolerance(Number(p.maxWaitTolerance));
      } else if (activeModel === 'caucedo-terminal') {
        if (p.berths != null) setBerths(Number(p.berths));
        if (p.quayCranes != null) setQuayCranes(Number(p.quayCranes));
        if (p.movesPerHourPerCrane != null) setMovesPerHourPerCrane(Number(p.movesPerHourPerCrane));
        if (p.cranePolicy != null) setCranePolicy(p.cranePolicy);
        if (p.arrivalRatePerDay != null) setArrivalRatePerDay(Number(p.arrivalRatePerDay));
      }
    }
    setActivePresetId(null);
  }, [initialParams, activeModel]);

  const getParameters = () => {
    if (activeModel === 'mm1-queue') {
      return { lambda, mu, servers, warmup };
    } else if (activeModel === 'mobility-dispatch') {
      return { fleetSize, policy, batchWindowSeconds, demandMultiplier, maxWaitTolerance };
    } else if (activeModel === 'caucedo-terminal') {
      return { berths, quayCranes, movesPerHourPerCrane, cranePolicy, arrivalRatePerDay };
    }
    return {};
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const payload = {
      name: name || `Gris Simulation - ${activeModel}`,
      description,
      modelType: activeModel,
      horizon: Number(horizon),
      replications: Number(replications),
      seedBase: Number(seed),
      parameters: getParameters(),
    };
    onSubmit(payload);
  };

  const handleExportSpec = () => {
    const spec = {
      specVersion: '1.0',
      name,
      description,
      modelType: activeModel,
      horizon: Number(horizon),
      replications: Number(replications),
      seedBase: Number(seed),
      parameters: getParameters(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(spec, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `gris_spec_${activeModel}_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleApplyImportedSpec = (spec) => {
    if (!spec) return;

    if (spec.modelType && spec.modelType !== activeModel && onSelectModel) {
      onSelectModel(spec.modelType);
    }

    if (spec.name) setName(spec.name);
    if (spec.description) setDescription(spec.description);
    if (spec.horizon) setHorizon(Number(spec.horizon));
    if (spec.replications) setReplications(Number(spec.replications));
    if (spec.seedBase) setSeed(Number(spec.seedBase));

    const p = spec.parameters || {};
    const targetModel = spec.modelType || activeModel;

    if (targetModel === 'mm1-queue') {
      if (p.lambda != null) setLambda(Number(p.lambda));
      if (p.mu != null) setMu(Number(p.mu));
      if (p.servers != null) setServers(Number(p.servers));
      if (p.warmup != null) setWarmup(Number(p.warmup));
    } else if (targetModel === 'mobility-dispatch') {
      if (p.fleetSize != null) setFleetSize(Number(p.fleetSize));
      if (p.policy != null) setPolicy(String(p.policy).toUpperCase());
      if (p.batchWindowSeconds != null) setBatchWindowSeconds(Number(p.batchWindowSeconds));
      if (p.demandMultiplier != null) setDemandMultiplier(Number(p.demandMultiplier));
      if (p.maxWaitTolerance != null) setMaxWaitTolerance(Number(p.maxWaitTolerance));
    } else if (targetModel === 'caucedo-terminal') {
      if (p.berths != null) setBerths(Number(p.berths));
      if (p.quayCranes != null) setQuayCranes(Number(p.quayCranes));
      if (p.movesPerHourPerCrane != null) setMovesPerHourPerCrane(Number(p.movesPerHourPerCrane));
      if (p.cranePolicy != null) setCranePolicy(String(p.cranePolicy).toUpperCase());
      if (p.arrivalRatePerDay != null) setArrivalRatePerDay(Number(p.arrivalRatePerDay));
    }

    setActivePresetId(null);
    setImportAlert(`Loaded '${spec.name || 'Experiment'}' (${targetModel}) successfully`);
    setTimeout(() => setImportAlert(null), 4000);
  };

  const handleImportSpec = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const spec = JSON.parse(event.target.result);
        handleApplyImportedSpec(spec);
      } catch {
        alert('Invalid JSON scenario specification file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Real-time theoretical calculations
  const rho = servers > 0 && mu > 0 ? lambda / (servers * mu) : 0;
  const theoreticalW = (servers === 1 && mu > lambda) ? 1.0 / (mu - lambda) : null;
  const theoreticalWq = (servers === 1 && mu > lambda) ? lambda / (mu * (mu - lambda)) : null;

  const currentPresets = PRESETS[activeModel] || [];

  return (
    <div className="panel" style={{ marginBottom: '20px' }}>
      {/* Header & Presets Row */}
      <div style={{ marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
              Scenario Formulation & Workbench
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Configure operational parameters and Monte Carlo execution bounds
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportSpec}
              accept=".json"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setIsImportModalOpen(true)}
              title="Import scenario configuration from CSV, Excel (.xlsx/.xls), or JSON"
            >
              <Upload size={12} style={{ color: '#38bdf8' }} />
              <span>Import Dataset / Spec</span>
              <span style={{ fontSize: '9.5px', opacity: 0.7, background: 'rgba(255, 255, 255, 0.08)', padding: '1px 5px', borderRadius: '3px' }}>
                CSV · XLSX · JSON
              </span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '4px 8px' }}
              onClick={handleExportSpec}
              title="Export scenario configuration as JSON"
            >
              <Download size={12} />
              Export Spec
            </button>
          </div>
        </div>

        {importAlert && (
          <div style={{
            margin: '8px 0',
            padding: '6px 12px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#34d399',
            fontSize: '11.5px'
          }}>
            <CheckCircle2 size={14} />
            <span>{importAlert}</span>
          </div>
        )}

        {/* Curated Presets Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '2px', fontWeight: 500 }}>
            Curated Presets:
          </span>
          {currentPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-pill ${activePresetId === preset.id ? 'active' : ''}`}
              onClick={() => applyPreset(preset)}
              title={preset.description}
            >
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {(() => {
          const activePreset = currentPresets.find((p) => p.id === activePresetId);
          if (!activePreset) return null;
          return (
            <div style={{
              marginTop: '10px',
              padding: '8px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Sliders size={13} style={{ color: '#0284c7', flexShrink: 0 }} />
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{activePreset.label}:</strong> {activePreset.description}
              </div>
            </div>
          );
        })()}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Scenario Metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label>Scenario Name</label>
            <input
              type="text"
              className="input-text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. M/M/1 Equilibrium Baseline"
              required
            />
          </div>
          <div>
            <label>Purpose / Description</label>
            <input
              type="text"
              className="input-text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief hypothesis or operational notes..."
            />
          </div>
        </div>

        {/* Two-Column Responsive Split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Left Column: Domain Model Specific Parameters */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                Model Specific Parameters
              </strong>
              <span className="badge badge-neutral font-mono" style={{ fontSize: '10px' }}>
                {activeModel}
              </span>
            </div>

            {/* M/M/1 Queue Form */}
            {activeModel === 'mm1-queue' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label>Arrival Rate λ (cust/s)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    max="10.0"
                    className="input-text font-mono"
                    value={lambda}
                    onChange={(e) => { setLambda(Number(e.target.value)); setActivePresetId(null); }}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Interarrival mean: {(1 / lambda).toFixed(2)}s</span>
                </div>
                <div>
                  <label>Service Rate μ (cust/s)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    max="10.0"
                    className="input-text font-mono"
                    value={mu}
                    onChange={(e) => { setMu(Number(e.target.value)); setActivePresetId(null); }}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Service mean: {(1 / mu).toFixed(2)}s</span>
                </div>
                <div>
                  <label>Parallel Servers (c)</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    className="input-text font-mono"
                    value={servers}
                    onChange={(e) => { setServers(Number(e.target.value)); setActivePresetId(null); }}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>c=1 for standard M/M/1</span>
                </div>
                <div>
                  <label>Warmup Horizon (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="input-text font-mono"
                    value={warmup}
                    onChange={(e) => { setWarmup(Number(e.target.value)); setActivePresetId(null); }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Discard transient warm-up</span>
                </div>
              </div>
            )}

            {/* NYC Mobility Form */}
            {activeModel === 'mobility-dispatch' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label>Fleet Size (Active Vehicles)</label>
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    step="25"
                    className="input-text font-mono"
                    value={fleetSize}
                    onChange={(e) => { setFleetSize(Number(e.target.value)); setActivePresetId(null); }}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Yellow cabs in fleet</span>
                </div>
                <div>
                  <label>Dispatch Policy</label>
                  <select
                    className="select-input font-mono"
                    value={policy}
                    onChange={(e) => { setPolicy(e.target.value); setActivePresetId(null); }}
                  >
                    <option value="NEAREST">NEAREST (Greedy First-Come)</option>
                    <option value="BATCHED">BATCHED (Window Optimization)</option>
                    <option value="PREPOSITIONING">PREPOSITIONING (Anticipatory)</option>
                  </select>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Vehicle assignment strategy</span>
                </div>
                <div>
                  <label>Batch Window (seconds)</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    step="5"
                    className="input-text font-mono"
                    value={batchWindowSeconds}
                    onChange={(e) => { setBatchWindowSeconds(Number(e.target.value)); setActivePresetId(null); }}
                    disabled={policy !== 'BATCHED'}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Used when policy is BATCHED</span>
                </div>
                <div>
                  <label>Demand Scaling Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="5.0"
                    className="input-text font-mono"
                    value={demandMultiplier}
                    onChange={(e) => { setDemandMultiplier(Number(e.target.value)); setActivePresetId(null); }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>1.0 = baseline TLC demand</span>
                </div>
              </div>
            )}

            {/* Caucedo Terminal Form */}
            {activeModel === 'caucedo-terminal' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label>Container Berths</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    className="input-text font-mono"
                    value={berths}
                    onChange={(e) => { setBerths(Number(e.target.value)); setActivePresetId(null); }}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Physical mooring berths</span>
                </div>
                <div>
                  <label>STS Quay Cranes</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="input-text font-mono"
                    value={quayCranes}
                    onChange={(e) => { setQuayCranes(Number(e.target.value)); setActivePresetId(null); }}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Available ship-to-shore cranes</span>
                </div>
                <div>
                  <label>Crane Policy</label>
                  <select
                    className="select-input font-mono"
                    value={cranePolicy}
                    onChange={(e) => { setCranePolicy(e.target.value); setActivePresetId(null); }}
                  >
                    <option value="DYNAMIC">DYNAMIC (Size Dependent)</option>
                    <option value="FIXED_PER_BERTH">FIXED_PER_BERTH (Strict 2/berth)</option>
                  </select>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Crane assignment method</span>
                </div>
                <div>
                  <label>Moves / Hour / Crane (GMPH)</label>
                  <input
                    type="number"
                    step="1"
                    min="15"
                    max="45"
                    className="input-text font-mono"
                    value={movesPerHourPerCrane}
                    onChange={(e) => { setMovesPerHourPerCrane(Number(e.target.value)); setActivePresetId(null); }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Standard rate: ~28 GMPH</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Execution Scope & Live Dynamic Theoretical Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Live Preview Card */}
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Theoretical Model Preview
                </span>
                {activeModel === 'mm1-queue' && (
                  <span className={`badge ${rho < 1.0 ? (rho < 0.85 ? 'badge-emerald' : 'badge-amber') : 'badge-rose'} font-mono`} style={{ fontSize: '10px' }}>
                    ρ = {(rho * 100).toFixed(1)}% ({rho < 1.0 ? 'Stable' : 'Unstable'})
                  </span>
                )}
              </div>

              {activeModel === 'mm1-queue' && (
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {theoreticalW !== null ? (
                    <div>
                      Theoretical W: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{theoreticalW.toFixed(3)}s</strong> | Wait W_q: <strong className="font-mono">{theoreticalWq.toFixed(3)}s</strong>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Closed-form proof available: Simulation will validate against exact W = 1/(μ-λ).
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#991b1b' }}>
                      Warning: Arrival rate λ ≥ service capacity (c · μ). System will not reach steady-state.
                    </div>
                  )}
                </div>
              )}

              {activeModel === 'mobility-dispatch' && (
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Active fleet: <strong className="font-mono">{fleetSize} cabs</strong> | Policy: <strong className="font-mono">{policy}</strong>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Simulating 11 NYC TLC zones including Midtown, Financial District, Brooklyn, JFK and LGA.
                  </div>
                </div>
              )}

              {activeModel === 'caucedo-terminal' && (
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Allocation ratio: <strong className="font-mono">{(quayCranes / berths).toFixed(1)} cranes/berth</strong> | Nominal handling: <strong className="font-mono">~{(quayCranes * movesPerHourPerCrane * 24).toLocaleString()} TEU/day</strong>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Simulating vessel arrivals, anchorage queues, tug piloting, and quay discharge operations.
                  </div>
                </div>
              )}
            </div>

            {/* Execution Horizon & Replications */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label>Virtual Horizon (s)</label>
                  <input
                    type="number"
                    min="10"
                    step="100"
                    className="input-text font-mono"
                    value={horizon}
                    onChange={(e) => setHorizon(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≈ {(horizon / 3600).toFixed(1)} hrs</span>
                </div>
                <div>
                  <label>Replications (N)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="input-text font-mono"
                    value={replications}
                    onChange={(e) => setReplications(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Student-t 95% CI</span>
                </div>
                <div>
                  <label>Base Seed (CRN)</label>
                  <input
                    type="number"
                    className="input-text font-mono"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    required
                  />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Reproducible</span>
                </div>
              </div>
            </div>

            {/* Domain Operational Scope (Balances vertical height on wide screens) */}
            {activeModel === 'mobility-dispatch' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  NYC Urban Mobility Dynamics:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <li><strong>Zone Topology</strong>: Manhattan commercial hubs, Brooklyn, Queens, JFK and LGA airports.</li>
                  <li><strong>Dispatch Algorithm</strong>: {policy === 'BATCHED' ? 'Bipartite matching over temporal window' : policy === 'PREPOSITION' ? 'Anticipatory relocation toward peak demand' : 'Greedy Haversine nearest-vehicle dispatch'}.</li>
                  <li><strong>Customer Reneging</strong>: Unassigned trips cancel if wait exceeds tolerance threshold.</li>
                </ul>
              </div>
            )}

            {activeModel === 'caucedo-terminal' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Port Logistics Dynamics:
                </strong>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <li><strong>Berth Allocation (BAP)</strong>: First-come first-served queue with tug maneuvering delays.</li>
                  <li><strong>Crane Scheduling (QCSP)</strong>: {cranePolicy === 'DYNAMIC' ? 'Dynamic crane reassignment proportional to vessel container volume' : 'Fixed 2 cranes per berth policy'}.</li>
                  <li><strong>Discharge Speed</strong>: Simulated at {movesPerHourPerCrane} gross crane moves per hour (GMPH).</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Runs concurrently across worker thread pool with independent stream isolation
          </span>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isRunning}
            style={{ fontSize: '13px', padding: '7px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Play size={14} />
            <span>{isRunning ? 'Simulation Running...' : 'Launch Monte Carlo Run'}</span>
          </button>
        </div>
      </form>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplySpec={handleApplyImportedSpec}
        currentModel={activeModel}
      />
    </div>
  );
}
