import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Header } from './components/layout/Header';
import { SkeletonResults, SkeletonHistory } from './components/layout/SkeletonLoader';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { TelemetryModal } from './components/modals/TelemetryModal';
import { AskBar } from './components/studio/AskBar';
import { ModelTabs } from './components/studio/ModelTabs';
import { ScenarioForm } from './components/studio/ScenarioForm';
import { ModelTheoryExpander } from './components/studio/ModelTheoryExpander';
import { ActiveExecution } from './components/results/ActiveExecution';
import { ResultsView } from './components/results/ResultsView';
import { PolicyComparison } from './components/results/PolicyComparison';
import { HistoryList } from './components/results/HistoryList';
import { SensitivitySweep } from './components/results/SensitivitySweep';
import {
  fetchModels,
  fetchScenarios,
  fetchScenario,
  submitScenario,
  subscribeScenarioEvents,
  abortScenario,
  deleteScenario,
  clearAllScenarios
} from './api';

export default function App() {
  const [models, setModels] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [activeModel, setActiveModel] = useState('mm1-queue');
  const [activeView, setActiveView] = useState('studio'); // 'studio' | 'results' | 'comparison' | 'history'
  const [showCopilot, setShowCopilot] = useState(false);
  const [showSweep, setShowSweep] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isResultsLoading, setIsResultsLoading] = useState(false);

  const [initialParams, setInitialParams] = useState(null);
  const [runningScenario, setRunningScenario] = useState(null);
  const [runningComparison, setRunningComparison] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [comparisonA, setComparisonA] = useState(null);
  const [comparisonB, setComparisonB] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [completionToast, setCompletionToast] = useState(null);

  const pollIntervalRef = useRef(null);
  const unsubscribeStreamRef = useRef(null);

  const refreshCatalog = async () => {
    try {
      const [mList, sList] = await Promise.all([fetchModels(), fetchScenarios()]);
      setModels(mList);
      setScenarios(sList);
      setIsConnected(true);
      setErrorMsg(null);
      return { mList, sList };
    } catch (err) {
      console.warn('Backend not yet reachable:', err.message);
      setIsConnected(false);
      return null;
    }
  };

  const loadInitialData = async () => {
    try {
      const data = await refreshCatalog();
      // Pre-select latest completed scenario on first load ONLY if user hasn't selected any yet
      if (data && data.sList.length > 0) {
        const latest = data.sList.find((s) => s.status === 'COMPLETED');
        if (latest) {
          const full = await fetchScenario(latest.id).catch(() => null);
          if (full) {
            setSelectedScenario((prev) => (prev ? prev : full));
          }
        }
      }
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(refreshCatalog, 8000);
    return () => {
      clearInterval(interval);
      if (unsubscribeStreamRef.current) unsubscribeStreamRef.current();
    };
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCopilot((prev) => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setShowSweep(false);
        setShowShortcuts(false);
        setShowTelemetry(false);
        setShowCopilot(false);
        return;
      }
      if (!isInput) {
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          return;
        }
        if (e.key === '1') { setActiveView('studio'); return; }
        if (e.key === '2') { setActiveView('results'); return; }
        if (e.key === '3') { setActiveView('comparison'); return; }
        if (e.key === '4') { setActiveView('history'); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startPollingScenario = (id, onDone) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const s = await fetchScenario(id);
        if (s.status === 'COMPLETED' || s.status === 'FAILED') {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setRunningScenario(null);
          setSelectedScenario(s);
          refreshCatalog();
          if (onDone) onDone(s);
        } else {
          setRunningScenario(s);
        }
      } catch (err) {
        console.error('Error polling scenario:', err);
      }
    }, 250);
  };

  const monitorScenario = (id, onDone) => {
    if (unsubscribeStreamRef.current) {
      unsubscribeStreamRef.current();
      unsubscribeStreamRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    let isTerminated = false;

    const unsub = subscribeScenarioEvents(id, {
      onProgress: (scen) => {
        if (!isTerminated) {
          setRunningScenario(scen);
        }
      },
      onComplete: (scen) => {
        if (isTerminated) return;
        isTerminated = true;
        setRunningScenario(null);
        setSelectedScenario(scen);
        setActiveView('results');
        setCompletionToast(`Simulation '${scen.name}' completed in ${scen.wallClockMs || 0}ms`);
        setTimeout(() => setCompletionToast(null), 4000);
        refreshCatalog();
        if (onDone) onDone(scen);
      },
      onError: (err) => {
        if (isTerminated) return;
        console.warn('SSE disconnected, falling back to HTTP polling for', id, err);
        startPollingScenario(id, onDone);
      },
    });

    unsubscribeStreamRef.current = unsub;
  };

  const handleLaunchScenario = async (payload) => {
    setErrorMsg(null);
    try {
      const created = await submitScenario(payload);
      setRunningScenario(created);
      monitorScenario(created.id);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start scenario');
    }
  };

  const handleExecuteComparison = async (nlComparisonResult) => {
    setErrorMsg(null);
    const compA = nlComparisonResult.comparisonA;
    const compB = nlComparisonResult.comparisonB;
    if (!compA || !compB) return;

    try {
      const payloadA = {
        name: compA.suggestedName,
        description: compA.description,
        modelType: compA.modelType,
        horizon: compA.horizon,
        replications: compA.replications,
        seedBase: compA.seed || 42,
        parameters: compA.parameters,
      };

      const payloadB = {
        name: compB.suggestedName,
        description: compB.description,
        modelType: compB.modelType,
        horizon: compB.horizon,
        replications: compB.replications,
        seedBase: compB.seed || 42,
        parameters: compB.parameters,
      };

      const [resA, resB] = await Promise.all([
        submitScenario(payloadA),
        submitScenario(payloadB),
      ]);

      setRunningComparison({
        scenarioA: resA,
        scenarioB: resB,
        title: nlComparisonResult.suggestedName,
      });

      let completedA = null;
      let completedB = null;

      const checkBothDone = () => {
        if (completedA && completedB) {
          setRunningComparison(null);
          setComparisonA(completedA);
          setComparisonB(completedB);
          setActiveView('comparison');
          setCompletionToast('Dual policy comparison completed');
          setTimeout(() => setCompletionToast(null), 4000);
          refreshCatalog();
        }
      };

      const pollA = setInterval(async () => {
        try {
          const s = await fetchScenario(resA.id);
          setRunningComparison((prev) => prev ? { ...prev, scenarioA: s } : null);
          if (s.status === 'COMPLETED' || s.status === 'FAILED') {
            clearInterval(pollA);
            completedA = s;
            checkBothDone();
          }
        } catch (e) {}
      }, 300);

      const pollB = setInterval(async () => {
        try {
          const s = await fetchScenario(resB.id);
          setRunningComparison((prev) => prev ? { ...prev, scenarioB: s } : null);
          if (s.status === 'COMPLETED' || s.status === 'FAILED') {
            clearInterval(pollB);
            completedB = s;
            checkBothDone();
          }
        } catch (e) {}
      }, 300);

    } catch (err) {
      setErrorMsg(err.message || 'Failed to start policy comparison');
    }
  };

  const handleApplyNlToForm = (nlResult) => {
    setActiveModel(nlResult.modelType);
    setInitialParams(nlResult);
    setActiveView('studio');
  };

  const handleExecuteParsedNl = (nlResult) => {
    const payload = {
      name: nlResult.suggestedName,
      description: nlResult.description,
      modelType: nlResult.modelType,
      horizon: nlResult.horizon,
      replications: nlResult.replications,
      seedBase: nlResult.seed,
      parameters: nlResult.parameters,
    };
    handleLaunchScenario(payload);
  };

  const handleSelectScenario = async (id) => {
    setIsResultsLoading(true);
    setActiveView('results');
    try {
      const full = await fetchScenario(id);
      setSelectedScenario(full);
    } catch (err) {
      setErrorMsg(`Failed to load scenario ${id}`);
    } finally {
      setIsResultsLoading(false);
    }
  };

  const handleAddToCompare = (scen) => {
    if (!comparisonA) {
      setComparisonA(scen);
      setActiveView('comparison');
    } else if (!comparisonB && comparisonA.id !== scen.id) {
      setComparisonB(scen);
      setActiveView('comparison');
    } else {
      setComparisonA(scen);
      setComparisonB(null);
      setActiveView('comparison');
    }
  };

  const handleCompareTwo = (scenA, scenB) => {
    setComparisonA(scenA);
    setComparisonB(scenB);
    setActiveView('comparison');
  };

  const handleCloneScenarioToForm = (scen) => {
    setActiveModel(scen.modelType);
    setInitialParams({
      name: `${scen.name} (Clone)`,
      description: scen.description,
      horizon: scen.horizon,
      replications: scen.replications,
      seed: scen.seedBase,
      parameters: scen.parameters,
    });
    setActiveView('studio');
  };

  const handleAbort = async (id) => {
    try {
      await abortScenario(id);
      if (runningScenario?.id === id) {
        setRunningScenario(null);
      }
      if (runningComparison?.scenarioA?.id === id || runningComparison?.scenarioB?.id === id) {
        setRunningComparison(null);
      }
      refreshCatalog();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to abort scenario');
    }
  };

  const handleDeleteScenario = async (id) => {
    try {
      await deleteScenario(id);
      if (selectedScenario?.id === id) setSelectedScenario(null);
      if (comparisonA?.id === id) setComparisonA(null);
      if (comparisonB?.id === id) setComparisonB(null);
      refreshCatalog();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete scenario');
    }
  };

  const handleClearAllScenarios = async () => {
    try {
      await clearAllScenarios();
      setSelectedScenario(null);
      setComparisonA(null);
      setComparisonB(null);
      refreshCatalog();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to clear scenarios');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-root)', paddingBottom: '40px' }}>
      {/* Top Application Header */}
      <Header
        models={models}
        scenarioCount={scenarios.length}
        isConnected={isConnected}
        activeView={activeView}
        onChangeView={setActiveView}
        hasSelectedScenario={!!selectedScenario}
        hasActiveComparison={!!(comparisonA && comparisonB)}
        showCopilot={showCopilot}
        onToggleCopilot={() => setShowCopilot(!showCopilot)}
        onToggleSweep={() => setShowSweep(!showSweep)}
        isSweepActive={showSweep}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenTelemetry={() => setShowTelemetry(true)}
      />

      {/* Main Content Area */}
      <main className="container" style={{ marginTop: '16px' }}>
        {/* Error Alert Banner */}
        {errorMsg && (
          <div style={{
            marginBottom: '14px',
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setErrorMsg(null)}
              style={{ padding: '2px 6px', fontSize: '11px' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Completion Toast Banner */}
        {completionToast && (
          <div style={{
            marginBottom: '14px',
            padding: '8px 14px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '4px',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12.5px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={14} style={{ color: '#059669' }} />
              <strong>{completionToast}</strong>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setCompletionToast(null)}
              style={{ padding: '1px 5px', fontSize: '10px' }}
            >
              <X size={11} />
            </button>
          </div>
        )}

        {/* Active Running Simulation Banner (Visible across any active view) */}
        {(runningScenario || runningComparison) && (
          <section style={{ marginBottom: '16px' }}>
            <ActiveExecution
              scenario={runningScenario}
              comparison={runningComparison}
              onAbort={handleAbort}
            />
          </section>
        )}

        {/* Simulation Copilot Panel (Slide down when toggled) */}
        {showCopilot && (
          <section style={{ marginBottom: '18px' }} className="animate-fade-in">
            <AskBar
              onApplyScenario={handleApplyNlToForm}
              onExecuteParsed={handleExecuteParsedNl}
              onExecuteComparison={handleExecuteComparison}
              activeScenario={selectedScenario}
            />
          </section>
        )}

        {/* Sensitivity Sweep Phase-Change Analysis Modal/Drawer */}
        {showSweep && (
          <section id="sensitivity-sweep-section" style={{ marginBottom: '18px' }} className="animate-fade-in">
            <SensitivitySweep onClose={() => setShowSweep(false)} />
          </section>
        )}

        {/* VIEW 1: STUDIO / WORKBENCH */}
        {activeView === 'studio' && (
          <div className="animate-fade-in">
            {/* Domain Model Selector Tabs */}
            <section style={{ marginBottom: '14px' }}>
              <ModelTabs
                activeModel={activeModel}
                onSelectModel={(id) => {
                  setActiveModel(id);
                  setInitialParams(null);
                }}
              />
            </section>

            {/* Parameter Formulation Form with Presets & Live Theoretical Calculation */}
            <section id="scenario-form-section">
              <ScenarioForm
                activeModel={activeModel}
                initialParams={initialParams}
                onSubmit={handleLaunchScenario}
                isRunning={!!runningScenario || !!runningComparison}
                onSelectModel={setActiveModel}
              />
            </section>

            {/* Model Theory & Governing Mathematical Formulations Expander */}
            <section>
              <ModelTheoryExpander activeModel={activeModel} />
            </section>
          </div>
        )}

        {/* VIEW 2: RESULTS & DIGITAL TWIN */}
        {activeView === 'results' && (
          <div className="animate-fade-in">
            {isResultsLoading ? (
              <SkeletonResults />
            ) : (
              <ResultsView
                scenario={selectedScenario}
                onCompareWith={handleAddToCompare}
                onCloneToForm={handleCloneScenarioToForm}
                onGoToStudio={() => setActiveView('studio')}
              />
            )}
          </div>
        )}

        {/* VIEW 3: POLICY COMPARISON */}
        {activeView === 'comparison' && (
          <div className="animate-fade-in">
            <PolicyComparison
              scenarioA={comparisonA}
              scenarioB={comparisonB}
              scenarios={scenarios}
              onSelectPair={(a, b) => {
                setComparisonA(a);
                setComparisonB(b);
              }}
              onClear={() => {
                setComparisonA(null);
                setComparisonB(null);
              }}
              onGoToStudio={() => setActiveView('studio')}
            />
          </div>
        )}

        {/* VIEW 4: RUNS HISTORY */}
        {activeView === 'history' && (
          <div className="animate-fade-in">
            {isInitialLoading ? (
              <SkeletonHistory />
            ) : (
              <HistoryList
                scenarios={scenarios}
                selectedId={selectedScenario?.id}
                onSelectScenario={handleSelectScenario}
                onRefresh={refreshCatalog}
                onCloneScenario={handleCloneScenarioToForm}
                onCompareSelected={handleCompareTwo}
                onDeleteScenario={handleDeleteScenario}
                onClearAllScenarios={handleClearAllScenarios}
              />
            )}
          </div>
        )}
      </main>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {/* Engine Telemetry Modal */}
      {showTelemetry && (
        <TelemetryModal
          models={models}
          isConnected={isConnected}
          onClose={() => setShowTelemetry(false)}
        />
      )}
    </div>
  );
}
