import React, { useState } from 'react';
import { RefreshCw, GitCompare, Copy, Trash2, Search, ExternalLink, Star, Tag } from 'lucide-react';

const PRESET_TAGS = ['Baseline', 'Stress Test', 'Candidate', 'Production'];

export function HistoryList({
  scenarios = [],
  selectedId,
  onSelectScenario,
  onRefresh,
  onCloneScenario,
  onCompareSelected,
  onDeleteScenario,
  onClearAllScenarios,
}) {
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('ALL');

  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gris_pinned_benchmarks') || '[]');
    } catch {
      return [];
    }
  });

  const [scenarioTags, setScenarioTags] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gris_scenario_tags') || '{}');
    } catch {
      return {};
    }
  });

  const togglePin = (id) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('gris_pinned_benchmarks', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to persist pinned benchmarks:', err);
      }
      return next;
    });
  };

  const cycleTag = (id) => {
    setScenarioTags((prev) => {
      const current = prev[id];
      const currentIndex = PRESET_TAGS.indexOf(current);
      let nextTag = null;
      if (currentIndex === -1) {
        nextTag = PRESET_TAGS[0];
      } else if (currentIndex < PRESET_TAGS.length - 1) {
        nextTag = PRESET_TAGS[currentIndex + 1];
      } else {
        nextTag = null; // cycle back to no tag
      }

      const next = { ...prev };
      if (!nextTag) {
        delete next[id];
      } else {
        next[id] = nextTag;
      }

      try {
        localStorage.setItem('gris_scenario_tags', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to persist scenario tags:', err);
      }
      return next;
    });
  };

  const toggleSelectForCompare = (id) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const handleCompareClick = () => {
    if (selectedForCompare.length === 2 && onCompareSelected) {
      const scenA = scenarios.find((s) => s.id === selectedForCompare[0]);
      const scenB = scenarios.find((s) => s.id === selectedForCompare[1]);
      if (scenA && scenB) {
        onCompareSelected(scenA, scenB);
      }
    }
  };

  const clearCompareSelection = () => {
    setSelectedForCompare([]);
  };

  const handleClearAll = () => {
    if (!window.confirm('Are you sure you want to delete all simulation history? This cannot be undone.')) return;
    if (onClearAllScenarios) onClearAllScenarios();
  };

  const filteredScenarios = scenarios.filter((s) => {
    if (modelFilter === 'PINNED') {
      if (!pinnedIds.includes(s.id)) return false;
    } else if (modelFilter !== 'ALL' && s.modelType !== modelFilter) {
      return false;
    }

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchId = s.id?.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      const matchTag = scenarioTags[s.id]?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchDesc && !matchTag) return false;
    }
    return true;
  });

  const sortedScenarios = [...filteredScenarios].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div className="panel animate-fade-in">
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
            Simulation Run Catalog & History
          </h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Persisted Monte Carlo scenario runs ({scenarios.length} total)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onClearAllScenarios && scenarios.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearAll}
              style={{ fontSize: '11.5px', padding: '4px 8px', color: '#991b1b' }}
              title="Delete all scenarios from database"
            >
              <Trash2 size={12} />
              Clear History
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            style={{ fontSize: '11.5px', padding: '4px 8px' }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '8px 12px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Model Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { id: 'ALL', label: 'All Models' },
            { id: 'PINNED', label: `★ Pinned (${pinnedIds.length})` },
            { id: 'mm1-queue', label: 'M/M/1 Queue' },
            { id: 'mobility-dispatch', label: 'NYC Mobility' },
            { id: 'caucedo-terminal', label: 'Caucedo Port' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              className={`preset-pill ${modelFilter === m.id ? 'active' : ''}`}
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={() => setModelFilter(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', width: '220px' }}>
          <input
            type="text"
            className="input-text"
            placeholder="Search by name, ID, or tag..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ fontSize: '11.5px', padding: '4px 8px 4px 26px' }}
          />
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Comparison Selection Action Banner */}
      {selectedForCompare.length > 0 && (
        <div style={{
          marginBottom: '12px',
          padding: '8px 12px',
          background: '#f5f3ff',
          border: '1px solid #ddd6fe',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCompare size={14} style={{ color: '#6b21a8' }} />
            <span style={{ color: '#581c87' }}>
              {selectedForCompare.length === 1 ? (
                <span><strong>1 run selected</strong>. Select 1 more to evaluate statistical differences.</span>
              ) : (
                <span><strong>2 runs selected</strong> ready for paired difference comparison.</span>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedForCompare.length === 2 && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '11.5px', padding: '3px 10px', background: '#6b21a8', borderColor: '#6b21a8' }}
                onClick={handleCompareClick}
              >
                <GitCompare size={12} />
                Compare Selected Runs
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px' }}
              onClick={clearCompareSelection}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Scenarios Table */}
      {sortedScenarios.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
          No simulation runs found matching the filter.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '28px', textAlign: 'center' }}>
                  <Star size={12} style={{ color: '#ca8a04', margin: '0 auto' }} />
                </th>
                <th style={{ width: '32px', textAlign: 'center' }}>
                  <span title="Select up to 2 runs to compare" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cmp</span>
                </th>
                <th>Scenario Name</th>
                <th>Model Type</th>
                <th>Benchmark Tag</th>
                <th>Reps</th>
                <th>Virtual Horizon</th>
                <th>Events Processed</th>
                <th>Wall-Clock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedScenarios.map((s) => {
                const isSelected = selectedId === s.id;
                const isCompareSelected = selectedForCompare.includes(s.id);
                const isCompleted = s.status === 'COMPLETED' && !!s.results;
                const isPinned = pinnedIds.includes(s.id);
                const tag = scenarioTags[s.id];
                const baselineScenario = scenarios.find(
                  (other) => pinnedIds.includes(other.id) && other.modelType === s.modelType && other.status === 'COMPLETED'
                );

                return (
                  <tr
                    key={s.id}
                    style={{
                      background: isCompareSelected
                        ? 'rgba(107, 33, 168, 0.05)'
                        : isSelected
                        ? '#f1f5f9'
                        : isPinned
                        ? 'rgba(254, 240, 138, 0.15)'
                        : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => onSelectScenario(s.id)}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => togglePin(s.id)}
                        title={isPinned ? 'Unpin benchmark' : 'Pin as reference benchmark'}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Star
                          size={13}
                          fill={isPinned ? '#eab308' : 'none'}
                          stroke={isPinned ? '#ca8a04' : '#94a3b8'}
                        />
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${s.name} for comparison`}
                        checked={isCompareSelected}
                        disabled={!isCompleted}
                        onChange={() => toggleSelectForCompare(s.id)}
                        style={{ cursor: isCompleted ? 'pointer' : 'not-allowed' }}
                        title={isCompleted ? 'Select to compare' : 'Only completed runs can be compared'}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                          {s.name}
                        </strong>
                        {isSelected && (
                          <span className="badge badge-emerald font-mono" style={{ fontSize: '9px', padding: '0 4px' }}>
                            Inspected
                          </span>
                        )}
                        {isPinned && (
                          <span className="badge badge-amber font-mono" style={{ fontSize: '9px', padding: '0 4px' }}>
                            Pinned
                          </span>
                        )}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {s.id.substring(0, 8)} · {new Date(s.createdAt * 1000 || s.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral font-mono" style={{ fontSize: '10.5px' }}>
                        {s.modelType}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => cycleTag(s.id)}
                        title="Click to cycle benchmark tag"
                        style={{
                          background: tag ? '#f1f5f9' : 'transparent',
                          border: `1px dashed ${tag ? '#cbd5e1' : '#e2e8f0'}`,
                          borderRadius: '12px',
                          padding: '1px 7px',
                          fontSize: '10px',
                          color: tag ? '#1e293b' : '#94a3b8',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Tag size={9} />
                        <span>{tag || '+ Tag'}</span>
                      </button>
                    </td>
                    <td className="font-mono">
                      {s.replications}
                    </td>
                    <td className="font-mono">
                      {s.horizon?.toLocaleString()}s
                    </td>
                    <td className="font-mono">
                      {s.results?.totalEventsProcessed ? s.results.totalEventsProcessed.toLocaleString() : '-'}
                    </td>
                    <td className="font-mono">
                      {s.wallClockMs ? `${s.wallClockMs}ms` : '-'}
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'COMPLETED' ? 'badge-emerald' : s.status === 'RUNNING' ? 'badge-blue' : s.status === 'CANCELLED' ? 'badge-neutral' : 'badge-rose'}`} style={{ fontSize: '10.5px' }}>
                        {s.status.toLowerCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '5px' }}>
                        {baselineScenario && baselineScenario.id !== s.id && isCompleted && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '3px 7px', color: '#6b21a8' }}
                            title={`Compare directly against pinned baseline (${baselineScenario.name})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onCompareSelected) onCompareSelected(baselineScenario, s);
                            }}
                          >
                            <GitCompare size={11} />
                            vs Base
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 7px' }}
                          title="Inspect results and digital twin"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectScenario(s.id);
                          }}
                        >
                          <ExternalLink size={11} />
                          Inspect
                        </button>
                        {onCloneScenario && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '3px 7px' }}
                            title="Clone parameters into workbench form"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloneScenario(s);
                            }}
                          >
                            <Copy size={11} />
                            Clone
                          </button>
                        )}
                        {onDeleteScenario && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '3px 7px', color: '#991b1b' }}
                            title="Delete this scenario"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteScenario(s.id);
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
