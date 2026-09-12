import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Activity, Cpu, Database, Hash, ShieldCheck } from 'lucide-react';

export function TelemetryModal({ models = [], isConnected, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modalContent = (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }} onClick={onClose}>
      <div
        className="panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: 'var(--text-primary)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>
              Gris Simulation Engine Telemetry
            </h3>
            <span className={`badge ${isConnected ? 'badge-emerald' : 'badge-rose'}`}>
              {isConnected ? 'Online' : 'Disconnected'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '3px 7px', fontSize: '11px' }}
          >
            <X size={13} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div className="panel-elevated">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              <Cpu size={12} />
              <span>Parallel Thread Pool</span>
            </div>
            <strong className="font-mono" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
              4 Worker Threads
            </strong>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Multi-replication executor</div>
          </div>

          <div className="panel-elevated">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              <Database size={12} />
              <span>Persistent Store</span>
            </div>
            <strong className="font-mono" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
              SQLite (/app/data/gris.db)
            </strong>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Zero-dependency embedded DB</div>
          </div>

          <div className="panel-elevated">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              <Hash size={12} />
              <span>RNG Stream Splitting</span>
            </div>
            <strong className="font-mono" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
              L64X128MixRandom
            </strong>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Common Random Numbers (CRN)</div>
          </div>

          <div className="panel-elevated">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              <ShieldCheck size={12} />
              <span>Core Generality</span>
            </div>
            <strong className="font-mono" style={{ fontSize: '13.5px', color: '#065f46' }}>
              gris-core Uncoupled
            </strong>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Zero domain leakage</div>
          </div>
        </div>

        {/* Registered Models List */}
        <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
          Registered Simulation Domain Models ({models.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {models.map((m) => (
            <div key={m.modelType} style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span className="font-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {m.modelType}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                  {Object.keys(m.parameters || {}).length} parameters
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                {m.description}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '12px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
