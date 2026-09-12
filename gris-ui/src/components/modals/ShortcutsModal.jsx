import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { key: '1', label: 'Switch to Studio / Workbench view' },
  { key: '2', label: 'Switch to Results & Digital Twin view' },
  { key: '3', label: 'Switch to Policy Comparison view' },
  { key: '4', label: 'Switch to Runs History view' },
  { key: 'Ctrl / ⌘ + K', label: 'Toggle Natural Language Copilot' },
  { key: 'Ctrl / ⌘ + Enter', label: 'Launch Monte Carlo simulation' },
  { key: '?', label: 'Open Keyboard Shortcuts cheat sheet' },
  { key: 'Esc', label: 'Close modals / active overlays' },
];

export function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={16} style={{ color: 'var(--text-primary)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>
              Keyboard Shortcuts
            </h3>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          {SHORTCUTS.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                background: '#f8fafc',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                fontSize: '12.5px'
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <kbd>{s.key}</kbd>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose} style={{ fontSize: '12px', padding: '4px 12px' }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
