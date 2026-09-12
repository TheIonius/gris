import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Printer,
  Download,
  X
} from 'lucide-react';
import { exportScenarioToPdf, openPrintableReportWindow } from '../../utils/pdfReportGenerator';

export function PdfReportModal({ isOpen, onClose, scenario }) {
  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !scenario) return null;

  const results = scenario.results || {};
  const sampleMetrics = Object.entries(results.sampleMetrics || {});
  const timeWeightedMetrics = Object.entries(results.timeWeightedMetrics || {});
  const params = Object.entries(scenario.parameters || {});

  const handleDownloadPdf = () => {
    exportScenarioToPdf(scenario);
  };

  const handlePrintPdf = () => {
    openPrintableReportWindow(scenario);
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflow: 'hidden'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '860px',
          height: 'min(88vh, 900px)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 40px rgba(220, 38, 38, 0.15)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.9) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
              }}
            >
              <FileText size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Executive Decision PDF Report
              </h2>
              <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0 }}>
                Publication-grade simulation audit and statistical confidence breakdown
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrintPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title="Open print dialog with high-res A4 vector styling"
            >
              <Printer size={13} />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)'
              }}
              title="Download vector PDF document directly"
            >
              <Download size={13} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Report Preview */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            backgroundColor: '#0a0f1d'
          }}
        >
          {/* Printable Document Sheet Simulation */}
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '6px',
              padding: '36px 40px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: 1.4,
              fontSize: '11px',
              maxWidth: '760px',
              margin: '0 auto'
            }}
          >
            {/* Document Header Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2.5px solid #0f172a',
                paddingBottom: '14px',
                marginBottom: '16px'
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  GRIS DIGITAL TWIN LABORATORY
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  Monte Carlo Discrete-Event Simulation Decision & Audit Report
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
                <div style={{ fontWeight: 700, color: '#dc2626' }}>CONFIDENTIAL & PROPRIETARY</div>
                <div style={{ marginTop: '2px' }}>{new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</div>
              </div>
            </div>

            {/* Overview Metadata Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '20px'
              }}
            >
              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                  Scenario Name
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {scenario.name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                  Model Domain
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                  {scenario.modelType}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                  Replications (MC)
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {scenario.replications || 1} independent runs
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                  Virtual Horizon
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {(scenario.horizon || 0).toLocaleString()}s
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                  Execution Status
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#059669', marginTop: '2px' }}>
                  ● {scenario.status}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                  Total Events
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {(results.totalEventsProcessed || 0).toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                  Engine Compute Time
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {results.wallClockMillis || results.elapsedMillis || 0} ms
                </div>
              </div>

              <div>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                  Master Seed
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                  {scenario.seedBase || 42}
                </div>
              </div>
            </div>

            {/* Primary KPI Scorecards */}
            <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '12px' }}>
              Primary Key Performance Indicators (95% Confidence Bounds)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '22px' }}>
              {sampleMetrics.slice(0, 3).map(([name, m]) => (
                <div
                  key={name}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '12px'
                  }}
                >
                  <div style={{ fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
                    {name.replace(/^[a-z_]+\./, '').replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                    {Number(m.mean || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '9px', color: '#059669', fontWeight: 600 }}>
                    95% CI: ±{Number(m.confidenceInterval95HalfWidth || 0).toFixed(2)} [{Number(m.confidenceInterval95Lower || 0).toFixed(2)} - {Number(m.confidenceInterval95Upper || 0).toFixed(2)}]
                  </div>
                </div>
              ))}
            </div>

            {/* Statistical Table */}
            <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px' }}>
              Sample Metrics Statistical Breakdown
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Metric Identifier</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Reps</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Grand Mean</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>95% CI Lower</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>95% CI Upper</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Half-Width (±)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Std Dev</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Min</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Max</th>
                </tr>
              </thead>
              <tbody>
                {sampleMetrics.map(([name, m], i) => (
                  <tr key={name} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{name}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{m.replications || 0}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{Number(m.mean || 0).toFixed(4)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.confidenceInterval95Lower || 0).toFixed(4)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.confidenceInterval95Upper || 0).toFixed(4)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#059669' }}>±{Number(m.confidenceInterval95HalfWidth || 0).toFixed(4)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.standardDeviation || 0).toFixed(4)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.min || 0).toFixed(2)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.max || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Time-Weighted Metrics */}
            {timeWeightedMetrics.length > 0 && (
              <>
                <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px' }}>
                  Time-Weighted Resource Utilization & State Metrics
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ background: '#334155', color: '#ffffff' }}>
                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>State Metric</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Time-Average</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>95% CI Lower</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>95% CI Upper</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Std Dev</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Min</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeWeightedMetrics.map(([name, m], i) => (
                      <tr key={name} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '5px 8px', fontWeight: 600 }}>{name}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{Number(m.mean || 0).toFixed(4)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.confidenceInterval95Lower || 0).toFixed(4)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.confidenceInterval95Upper || 0).toFixed(4)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.standardDeviation || 0).toFixed(4)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.min || 0).toFixed(3)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(m.max || 0).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Parameters Matrix */}
            <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px' }}>
              Configured Experimental Parameters
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px 20px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '10px 14px',
                fontSize: '10px',
                marginBottom: '24px'
              }}
            >
              {params.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #cbd5e1', paddingBottom: '3px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{k}:</span>
                  <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{String(v)}</span>
                </div>
              ))}
            </div>

            {/* Footer Sign-off Block */}
            <div
              style={{
                borderTop: '1px dashed #94a3b8',
                paddingTop: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                fontSize: '9px',
                color: '#64748b'
              }}
            >
              <div>
                <div><strong>METHODOLOGY:</strong> High-precision discrete-event simulation with SplitMix64 deterministic seeds.</div>
                <div>Scenario ID: {scenario.id} | Engine v0.1.0</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div>Approved by: ______________________________</div>
                <div style={{ marginTop: '4px' }}>Simulation Systems Lead</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
