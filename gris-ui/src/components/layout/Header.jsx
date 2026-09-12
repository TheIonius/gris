import React from 'react';
import { Layers, BarChart2, GitCompare, Database, Sparkles, Sliders, BookOpen, Keyboard } from 'lucide-react';

export function Header({
  models = [],
  scenarioCount = 0,
  isConnected,
  activeView = 'studio',
  onChangeView,
  hasSelectedScenario = false,
  hasActiveComparison = false,
  showCopilot = false,
  onToggleCopilot,
  onToggleSweep,
  isSweepActive = false,
  onOpenShortcuts,
  onOpenTelemetry,
}) {
  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px' }}>
        {/* Brand & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
                <line x1="8" y1="16" x2="13" y2="16" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                <path d="M23.5 11 C22 8 19 6.5 15.5 6.5 C10.2 6.5 6.5 10.8 6.5 16 C6.5 21.2 10.2 25.5 15.5 25.5 C20.5 25.5 23.8 22 24.5 17.5 H15" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="20.5" cy="17.5" r="2.2" fill="#38bdf8" />
              </svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Gris
            </span>
            <span className="badge badge-neutral font-mono" style={{ fontSize: '10px', padding: '1px 5px' }}>
              v0.1 DES
            </span>
          </div>

          {/* Primary View Navigation Tabs */}
          <nav className="nav-tabs-bar">
            <button
              type="button"
              className={`nav-tab-item ${activeView === 'studio' ? 'active' : ''}`}
              onClick={() => onChangeView('studio')}
            >
              <Layers size={13} />
              <span>Studio / Model</span>
            </button>

            <button
              type="button"
              className={`nav-tab-item ${activeView === 'results' ? 'active' : ''}`}
              onClick={() => onChangeView('results')}
            >
              <BarChart2 size={13} />
              <span>Results & Twin</span>
              {hasSelectedScenario && (
                <span className="badge badge-emerald" style={{ padding: '0 4px', fontSize: '9.5px', height: '15px' }}>
                  Live
                </span>
              )}
            </button>

            <button
              type="button"
              className={`nav-tab-item ${activeView === 'comparison' ? 'active' : ''}`}
              onClick={() => onChangeView('comparison')}
            >
              <GitCompare size={13} />
              <span>Comparison</span>
              {hasActiveComparison && (
                <span className="badge badge-purple" style={{ padding: '0 4px', fontSize: '9.5px', height: '15px' }}>
                  Dual
                </span>
              )}
            </button>

            <button
              type="button"
              className={`nav-tab-item ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => onChangeView('history')}
            >
              <Database size={13} />
              <span>Runs History</span>
              {scenarioCount > 0 && (
                <span className="badge badge-neutral font-mono" style={{ padding: '0 5px', fontSize: '10px', height: '16px' }}>
                  {scenarioCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right Tools & Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Natural Language Copilot Toggle */}
          <button
            type="button"
            className={`btn ${showCopilot ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11.5px', padding: '4px 9px' }}
            onClick={onToggleCopilot}
            title="Toggle Natural-Language Simulation Copilot"
          >
            <Sparkles size={13} style={{ color: showCopilot ? '#ffffff' : '#0284c7' }} />
            <span>Copilot</span>
          </button>

          {/* Parameter Sweeps Toggle */}
          {onToggleSweep && (
            <button
              type="button"
              className={`btn ${isSweepActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11.5px', padding: '4px 9px' }}
              onClick={onToggleSweep}
              title="Sensitivity parameter sweep analysis"
            >
              <Sliders size={13} />
              <span>Sweep</span>
            </button>
          )}

          {/* OpenAPI Docs */}
          <a
            href="/swagger-ui.html"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: '11.5px', padding: '4px 9px', textDecoration: 'none' }}
            title="Interactive Swagger/OpenAPI API Explorer"
          >
            <BookOpen size={13} />
            <span>API</span>
          </a>

          {/* Keyboard Shortcuts Button */}
          {onOpenShortcuts && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '11.5px', padding: '4px 8px' }}
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard size={13} />
            </button>
          )}

          {/* Engine Status Indicator (Clickable Telemetry) */}
          <div
            onClick={onOpenTelemetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              cursor: onOpenTelemetry ? 'pointer' : 'default'
            }}
            title={onOpenTelemetry ? 'Click to inspect engine telemetry' : undefined}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444'
            }} className={isConnected ? 'status-pulse' : ''} />
            <span className="font-mono">
              {isConnected ? `${models.length} Models Ready` : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
