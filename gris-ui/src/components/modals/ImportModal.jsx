import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  ArrowRight,
  ClipboardPaste
} from 'lucide-react';
import { parseImportFile, parseImportText, generateSampleTemplate } from '../../utils/importParser';

export function ImportModal({ isOpen, onClose, onApplySpec, currentModel = 'mm1-queue' }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste' | 'templates'
  const [dragActive, setDragActive] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

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

  if (!isOpen) return null;

  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const processFile = async (file) => {
    setIsProcessing(true);
    try {
      const res = await parseImportFile(file);
      setParsedResult(res);
    } catch (err) {
      setParsedResult({ success: false, error: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setRawText(text);
    if (text.trim().length > 10) {
      const res = parseImportText(text, 'auto');
      setParsedResult(res);
    } else {
      setParsedResult(null);
    }
  };

  const handleDownloadTemplate = (modelType, format) => {
    const content = generateSampleTemplate(modelType, format);
    const blob = new Blob([content], {
      type: format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : (format === 'json' ? 'application/json' : 'text/csv')
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gris_template_${modelType}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    if (parsedResult?.success && parsedResult?.spec) {
      onApplySpec(parsedResult.spec);
      onClose();
    }
  };

  const modelBadgeColor = {
    'mm1-queue': { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    'mobility-dispatch': { bg: 'rgba(234, 179, 8, 0.12)', text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' },
    'caucedo-terminal': { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }
  };

  const currentBadge = parsedResult?.spec?.modelType
    ? modelBadgeColor[parsedResult.spec.modelType] || { bg: 'rgba(148, 163, 184, 0.12)', text: '#cbd5e1', border: '#475569' }
    : null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 30px rgba(59, 130, 246, 0.15)',
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
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
              }}
            >
              <Upload size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Data & Scenario Importer
              </h2>
              <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0 }}>
                Upload or paste configuration parameters from CSV, Excel (.xlsx, .xls), or JSON
              </p>
            </div>
          </div>

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

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            padding: '4px 16px',
            background: '#090d16',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <button
            type="button"
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 500,
              background: activeTab === 'upload' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === 'upload' ? '#f8fafc' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={13} />
            Upload File
          </button>

          <button
            type="button"
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 500,
              background: activeTab === 'paste' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === 'paste' ? '#f8fafc' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('paste')}
          >
            <ClipboardPaste size={13} />
            Direct Paste
          </button>

          <button
            type="button"
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 500,
              background: activeTab === 'templates' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === 'templates' ? '#f8fafc' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('templates')}
          >
            <Download size={13} />
            Sample Templates
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'upload' && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.16)'}`,
                  backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.08)' : 'rgba(30, 41, 59, 0.3)',
                  borderRadius: '10px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv,.xlsx,.xls,.json,.txt,.tsv"
                  style={{ display: 'none' }}
                />

                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 12px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60a5fa'
                  }}
                >
                  <Upload size={22} />
                </div>

                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  {isProcessing ? 'Inspecting and Parsing File...' : 'Drag & drop simulation dataset or click to browse'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>
                  Supports CSV (tabular or key-value), Microsoft Excel (.xlsx, .xls), and JSON scenario specs
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(14, 165, 233, 0.12)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={10} /> .CSV
                  </span>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileSpreadsheet size={10} /> .XLSX / .XLS
                  </span>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileCode size={10} /> .JSON
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '8px' }}>
                Paste CSV table, parameter key-value pairs, or JSON scenario spec below:
              </div>
              <textarea
                value={rawText}
                onChange={handleTextChange}
                placeholder={`parameter,value\nname,Peak Mobility Surge\nmodelType,mobility-dispatch\nfleetSize,350\npolicy,BATCHED\nhorizon,7200\nreplications,10`}
                style={{
                  width: '100%',
                  height: '140px',
                  backgroundColor: '#090d16',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '11px',
                  padding: '10px 12px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          )}

          {activeTab === 'templates' && (
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                Download pre-calibrated sample templates ready for spreadsheet editing and immediate re-import:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { id: 'mm1-queue', title: 'M/M/1 Queue', desc: 'Poisson arrival & exponential service' },
                  { id: 'mobility-dispatch', title: 'NYC Mobility', desc: 'Urban fleet dispatch & diurnal curves' },
                  { id: 'caucedo-terminal', title: 'Caucedo Port', desc: 'Berths, quay cranes & vessel traffic' }
                ].map((tpl) => {
                  const isCurrent = tpl.id === currentModel;
                  return (
                    <div
                      key={tpl.id}
                      style={{
                        backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'rgba(30, 41, 59, 0.4)',
                        border: isCurrent ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#f8fafc' }}>
                          {tpl.title}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: '9px', fontWeight: 600, color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>
                            Active
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginBottom: '10px', height: '28px' }}>
                        {tpl.desc}
                      </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <button
                        type="button"
                        onClick={() => handleDownloadTemplate(tpl.id, 'csv')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          fontSize: '11px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <span>CSV Template</span>
                        <Download size={11} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadTemplate(tpl.id, 'xlsx')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          fontSize: '11px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#34d399',
                          border: '1px solid rgba(52, 211, 153, 0.2)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <span>Excel (.xlsx)</span>
                        <Download size={11} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadTemplate(tpl.id, 'json')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          fontSize: '11px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#fbbf24',
                          border: '1px solid rgba(251, 191, 36, 0.2)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <span>JSON Spec</span>
                        <Download size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* Validation & Inspection Matrix */}
          {parsedResult && (
            <div style={{ marginTop: '16px' }}>
              {parsedResult.success ? (
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#f8fafc' }}>
                        Specification Validated
                      </span>
                      {parsedResult.format && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                          Format: {parsedResult.format}
                        </span>
                      )}
                    </div>

                    {currentBadge && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: currentBadge.bg,
                          color: currentBadge.text,
                          border: `1px solid ${currentBadge.border}`
                        }}
                      >
                        {parsedResult.spec.modelType}
                      </span>
                    )}
                  </div>

                  {/* Summary Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      backgroundColor: 'rgba(30, 41, 59, 0.4)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontSize: '11px'
                    }}
                  >
                    <div>
                      <div style={{ color: '#64748b', fontSize: '9.5px', textTransform: 'uppercase' }}>Scenario Name</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {parsedResult.spec.name}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '9.5px', textTransform: 'uppercase' }}>Horizon</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>
                        {(parsedResult.spec.horizon || 0).toLocaleString()}s
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '9.5px', textTransform: 'uppercase' }}>Replications</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>
                        {parsedResult.spec.replications || 1} reps
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '9.5px', textTransform: 'uppercase' }}>Master Seed</div>
                      <div style={{ color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>
                        {parsedResult.spec.seedBase || 42}
                      </div>
                    </div>
                  </div>

                  {/* Parameters Table */}
                  <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 600, color: '#cbd5e1' }}>
                    Calibrated Parameters:
                  </div>

                  <div
                    style={{
                      maxHeight: '130px',
                      overflowY: 'auto',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '6px',
                      backgroundColor: '#090d16'
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(30, 41, 59, 0.5)', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '5px 8px' }}>Parameter</th>
                          <th style={{ padding: '5px 8px' }}>Parsed Value</th>
                          <th style={{ padding: '5px 8px', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedResult.fieldStatus?.map((fs) => (
                          <tr key={fs.field} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <td style={{ padding: '4px 8px', color: '#e2e8f0', fontWeight: 500 }}>
                              {fs.field}
                            </td>
                            <td style={{ padding: '4px 8px', color: '#38bdf8', fontFamily: 'monospace' }}>
                              {fs.message}
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background:
                                    fs.status === 'valid'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : fs.status === 'adjusted'
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'rgba(59, 130, 246, 0.15)',
                                  color:
                                    fs.status === 'valid'
                                      ? '#34d399'
                                      : fs.status === 'adjusted'
                                      ? '#fbbf24'
                                      : '#60a5fa'
                                }}
                              >
                                {fs.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Warnings */}
                  {parsedResult.warnings?.length > 0 && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        fontSize: '10.5px',
                        color: '#fbbf24',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px'
                      }}
                    >
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        {parsedResult.warnings.map((w, idx) => (
                          <div key={idx}>{w}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#f87171',
                    fontSize: '11.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{parsedResult.error || 'Parsing error encountered.'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)'
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            {parsedResult?.success ? 'Ready to load parameters into workbench' : 'Select a file or template to begin'}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!parsedResult?.success}
              onClick={handleApply}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: parsedResult?.success ? 'pointer' : 'not-allowed',
                background: parsedResult?.success
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : 'rgba(255, 255, 255, 0.08)',
                color: parsedResult?.success ? '#ffffff' : '#64748b',
                boxShadow: parsedResult?.success ? '0 2px 10px rgba(37, 99, 235, 0.4)' : 'none'
              }}
            >
              <span>Apply to Workbench</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
