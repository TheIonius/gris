import * as XLSX from 'xlsx';
export { exportScenarioToPdf, openPrintableReportWindow } from './pdfReportGenerator';

/**
 * Export helpers for scenario simulation results:
 * Excel (.xlsx / .xls), CSV, and JSON.
 */

function sanitizeFilename(name) {
  return (name || 'scenario')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 48);
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatWorksheetNumberCells(ws) {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (cell && cell.t === 'n') {
        if (Number.isInteger(cell.v)) {
          cell.z = '#,##0';
        } else {
          cell.z = '#,##0.0000';
        }
      }
    }
  }
}

/**
 * Builds a multi-sheet workbook for the scenario.
 */
export function buildScenarioWorkbook(scenario) {
  const results = scenario?.results || {};
  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};
  const params = scenario?.parameters || {};

  const wb = XLSX.utils.book_new();

  // --- SHEET 1: Executive Dashboard ---
  const summaryRows = [
    ['GRIS DIGITAL TWIN LABORATORY // EXECUTIVE DECISION REPORT'],
    ['Scenario Name:', scenario?.name || 'Untitled Scenario'],
    ['Report Timestamp:', new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC', 'Classification:', 'Confidential - Engineering Operations'],
    [''],
    ['1. SIMULATION RUN SPECIFICATIONS & METADATA'],
    ['Specification Parameter', 'Configured Value / Setting'],
    ['Model Architecture Domain', scenario?.modelType || 'N/A'],
    ['Scenario UUID', scenario?.id || 'N/A'],
    ['Execution Status', scenario?.status || 'N/A'],
    ['Monte Carlo Replications (n)', scenario?.replications || 1],
    ['Virtual Simulation Horizon', (scenario?.horizon || 0).toLocaleString() + ' seconds (' + ((scenario?.horizon || 0) / 3600).toFixed(2) + ' hours)'],
    ['Total Events Processed', Number(results.totalEventsProcessed || 0)],
    ['Engine Compute Latency', (results.wallClockMillis || results.elapsedMillis || 0) + ' ms'],
    ['PRNG Stream Architecture', 'SplitMix64 deterministic streams (Base Seed: ' + (scenario?.seedBase || 42) + ')'],
    [''],
    ['2. PRIMARY EXECUTIVE KEY PERFORMANCE INDICATORS (95% CONFIDENCE)'],
    ['Key Performance Indicator', 'Sample Mean', '95% CI Lower', '95% CI Upper', 'Margin of Error (±)', 'Std Deviation']
  ];

  Object.entries(sampleMetrics).slice(0, 5).forEach(([k, m]) => {
    summaryRows.push([
      k,
      Number(Number(m.mean || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95Lower || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95Upper || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95HalfWidth || 0).toFixed(4)),
      Number(Number(m.standardDeviation || 0).toFixed(4))
    ]);
  });

  summaryRows.push(['']);
  summaryRows.push(['3. CONFIGURED EXPERIMENTAL PARAMETERS']);
  summaryRows.push(['Input Parameter Name', 'Configured Simulation Setting']);
  Object.entries(params).forEach(([k, v]) => {
    summaryRows.push([k, v]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 42 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
  formatWorksheetNumberCells(wsSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Dashboard');

  // --- SHEET 2: Sample Metrics (95% CI) ---
  const sampleData = [
    ['Metric Identifier', 'Reps', 'Sample Mean', '95% CI Lower', '95% CI Upper', 'Half-Width (±)', 'Std Deviation', 'Std Error', 'Variance', 'Min Observed', 'Max Observed']
  ];
  Object.entries(sampleMetrics).forEach(([k, m]) => {
    sampleData.push([
      k,
      m.replications || 0,
      Number(Number(m.mean || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95Lower || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95Upper || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95HalfWidth || 0).toFixed(4)),
      Number(Number(m.standardDeviation || 0).toFixed(4)),
      Number(Number(m.standardError || 0).toFixed(4)),
      Number(Number(m.variance || 0).toFixed(4)),
      Number(Number(m.min || 0).toFixed(4)),
      Number(Number(m.max || 0).toFixed(4))
    ]);
  });
  const wsSample = XLSX.utils.aoa_to_sheet(sampleData);
  wsSample['!cols'] = [
    { wch: 38 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 }
  ];
  formatWorksheetNumberCells(wsSample);
  XLSX.utils.book_append_sheet(wb, wsSample, 'Sample Metrics (95% CI)');

  // --- SHEET 3: Time-Weighted State Metrics ---
  const twData = [
    ['Resource / State Metric', 'Reps', 'Time-Average Mean', '95% CI Lower', '95% CI Upper', 'Half-Width (±)', 'Std Deviation', 'Min Observed', 'Max Observed']
  ];
  Object.entries(timeWeightedMetrics).forEach(([k, m]) => {
    twData.push([
      k,
      m.replications || 0,
      Number(Number(m.mean || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95Lower || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95Upper || 0).toFixed(4)),
      Number(Number(m.confidenceInterval95HalfWidth || 0).toFixed(4)),
      Number(Number(m.standardDeviation || 0).toFixed(4)),
      Number(Number(m.min || 0).toFixed(4)),
      Number(Number(m.max || 0).toFixed(4))
    ]);
  });
  const wsTw = XLSX.utils.aoa_to_sheet(twData);
  wsTw['!cols'] = [
    { wch: 38 },
    { wch: 10 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 }
  ];
  formatWorksheetNumberCells(wsTw);
  XLSX.utils.book_append_sheet(wb, wsTw, 'Time-Weighted Metrics');

  // --- SHEET 4: Event Counters ---
  const counterData = [
    ['Event Counter Identifier', 'Replications', 'Mean Cumulative Count', 'CI Half-Width (±)', 'Min Observed', 'Max Observed']
  ];
  Object.entries(counters).forEach(([k, m]) => {
    counterData.push([
      k,
      m.replications || scenario?.replications || 1,
      Number(Number(m.mean || 0).toFixed(2)),
      Number(Number(m.confidenceInterval95HalfWidth || 0).toFixed(2)),
      Math.round(m.min || 0),
      Math.round(m.max || 0)
    ]);
  });
  const wsCounters = XLSX.utils.aoa_to_sheet(counterData);
  wsCounters['!cols'] = [
    { wch: 38 },
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 }
  ];
  formatWorksheetNumberCells(wsCounters);
  XLSX.utils.book_append_sheet(wb, wsCounters, 'Event Counters');

  // --- SHEET 5: Data Dictionary & Methodology ---
  const dictData = [
    ['GRIS SIMULATION STATISTICAL METHODOLOGY & DATA DICTIONARY', ''],
    ['', ''],
    ['Term / Concept', 'Mathematical Definition & Simulation Role'],
    ['Monte Carlo Replications (n)', 'Independent runs executed with distinct seeds to compute variance and Student-t confidence intervals.'],
    ['Confidence Interval (95%)', 'Two-sided Student-t confidence interval: CI = Mean ± t(n-1, 0.975) * (s / sqrt(n)).'],
    ['Half-Width (Margin of Error)', 'The ± half-width of the 95% confidence interval. Smaller half-width indicates higher precision.'],
    ['Time-Weighted Metric', 'Integral of state variable over simulated time divided by horizon T: (1/T) * ∫ Y(t) dt.'],
    ['PRNG Stream Isolation', 'SplitMix64 + L64X128MixRandom algorithms guarantee non-overlapping pseudo-random streams.'],
    ['Virtual Horizon (T)', 'Total virtual simulation time elapsed in seconds.'],
    ['Warmup Period', 'Initial transient period excluded from statistical accumulation to achieve steady-state ergodicity.'],
    ['Significance Level (alpha)', 'Set to alpha = 0.05, representing a 95% probability that the true parameter lies within the computed interval.']
  ];
  const wsDict = XLSX.utils.aoa_to_sheet(dictData);
  wsDict['!cols'] = [
    { wch: 34 },
    { wch: 88 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDict, 'Methodology & Dictionary');

  return wb;
}

/**
 * Exports scenario results as a binary Microsoft Excel BIFF8 Workbook (.xls).
 * Generates true binary BIFF8 workbook (no XML warnings) with 5 structured sheets and number formatting.
 */
export function exportScenarioToExcel(scenario) {
  if (!scenario) return;
  const wb = buildScenarioWorkbook(scenario);
  const out = XLSX.write(wb, { bookType: 'biff8', type: 'array' });
  const filename = `gris_report_${sanitizeFilename(scenario.name)}_${Date.now()}.xls`;
  triggerDownload(out, filename, 'application/vnd.ms-excel');
}

/**
 * Exports scenario results as a modern Microsoft Excel OpenXML Workbook (.xlsx).
 * Generates OpenXML workbook with 5 structured sheets, column width metadata, and number formatting.
 */
export function exportScenarioToXlsx(scenario) {
  if (!scenario) return;
  const wb = buildScenarioWorkbook(scenario);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = `gris_report_${sanitizeFilename(scenario.name)}_${Date.now()}.xlsx`;
  triggerDownload(out, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/**
 * Exports scenario results as an enhanced, RFC-4180 compliant CSV file
 * structured for Python Pandas, R, and automated analytics scripts.
 */
export function exportScenarioToCsv(scenario) {
  if (!scenario) return;

  const results = scenario.results || {};
  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};
  const params = scenario.parameters || {};

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    '# ==============================================================================',
    '# GRIS DIGITAL TWIN LABORATORY - EXECUTIVE SIMULATION DECISION REPORT',
    `# Scenario Name: ${escapeCsv(scenario.name)}`,
    `# Scenario ID: ${escapeCsv(scenario.id)}`,
    `# Model Domain: ${escapeCsv(scenario.modelType)}`,
    `# Status: ${escapeCsv(scenario.status)}`,
    `# Monte Carlo Replications: ${scenario.replications || 1} independent runs`,
    `# Virtual Horizon: ${(scenario.horizon || 0).toLocaleString()} seconds (${((scenario.horizon || 0) / 3600).toFixed(2)} hours)`,
    `# Total Events Processed: ${(results.totalEventsProcessed || 0).toLocaleString()}`,
    `# Engine Latency: ${results.wallClockMillis || results.elapsedMillis || 0} ms`,
    `# Master PRNG Seed: ${scenario.seedBase || 42}`,
    `# Export Timestamp: ${new Date().toISOString()}`,
    `# Statistical Methodology: Two-sided Student-t 95% Confidence Interval (alpha = 0.05)`,
    '# ==============================================================================',
    '',
    '# --- CONFIGURED EXPERIMENTAL PARAMETERS ---',
    'Parameter,ConfiguredValue'
  ];

  Object.entries(params).forEach(([k, v]) => {
    lines.push(`${escapeCsv(k)},${escapeCsv(v)}`);
  });

  lines.push('');
  lines.push('# --- SAMPLE PERFORMANCE METRICS (95% CONFIDENCE INTERVALS) ---');
  lines.push('Category,MetricIdentifier,Replications,SampleMean,CI95_Lower,CI95_Upper,CI95_HalfWidth,StdDev,StdError,Variance,MinObserved,MaxObserved');

  Object.entries(sampleMetrics).forEach(([k, m]) => {
    lines.push([
      'Sample',
      escapeCsv(k),
      m.replications,
      m.mean,
      m.confidenceInterval95Lower,
      m.confidenceInterval95Upper,
      m.confidenceInterval95HalfWidth,
      m.standardDeviation,
      m.standardError,
      m.variance,
      m.min,
      m.max
    ].join(','));
  });

  lines.push('');
  lines.push('# --- TIME-WEIGHTED STATE METRICS & RESOURCE UTILIZATION ---');
  lines.push('Category,MetricIdentifier,Replications,TimeAverageMean,CI95_Lower,CI95_Upper,CI95_HalfWidth,StdDev,StdError,Variance,MinObserved,MaxObserved');

  Object.entries(timeWeightedMetrics).forEach(([k, m]) => {
    lines.push([
      'TimeWeighted',
      escapeCsv(k),
      m.replications,
      m.mean,
      m.confidenceInterval95Lower,
      m.confidenceInterval95Upper,
      m.confidenceInterval95HalfWidth,
      m.standardDeviation,
      m.standardError,
      m.variance,
      m.min,
      m.max
    ].join(','));
  });

  lines.push('');
  lines.push('# --- CUMULATIVE EVENT COUNTERS ---');
  lines.push('Category,MetricIdentifier,Replications,MeanCount,CI95_HalfWidth,MinObserved,MaxObserved');

  Object.entries(counters).forEach(([k, m]) => {
    lines.push([
      'Counter',
      escapeCsv(k),
      m.replications || scenario.replications || 1,
      m.mean,
      m.confidenceInterval95HalfWidth || 0,
      m.min,
      m.max
    ].join(','));
  });

  const filename = `gris_report_${sanitizeFilename(scenario.name)}_${Date.now()}.csv`;
  triggerDownload(lines.join('\n'), filename, 'text/csv;charset=utf-8');
}

/**
 * Exports scenario metrics as a 100% tidy machine-readable CSV for Python/Pandas and R.
 */
export function exportScenarioToTidyCsv(scenario) {
  if (!scenario) return;

  const results = scenario.results || {};
  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [
    'scenario_id,scenario_name,model_type,category,metric,replications,mean,ci95_lower,ci95_upper,ci95_half_width,std_dev,min,max'
  ];

  const sid = escapeCsv(scenario.id);
  const sname = escapeCsv(scenario.name);
  const smodel = escapeCsv(scenario.modelType);

  Object.entries(sampleMetrics).forEach(([k, m]) => {
    rows.push([
      sid, sname, smodel, 'sample', escapeCsv(k),
      m.replications, m.mean, m.confidenceInterval95Lower, m.confidenceInterval95Upper,
      m.confidenceInterval95HalfWidth, m.standardDeviation, m.min, m.max
    ].join(','));
  });

  Object.entries(timeWeightedMetrics).forEach(([k, m]) => {
    rows.push([
      sid, sname, smodel, 'time_weighted', escapeCsv(k),
      m.replications, m.mean, m.confidenceInterval95Lower, m.confidenceInterval95Upper,
      m.confidenceInterval95HalfWidth, m.standardDeviation, m.min, m.max
    ].join(','));
  });

  Object.entries(counters).forEach(([k, m]) => {
    rows.push([
      sid, sname, smodel, 'counter', escapeCsv(k),
      m.replications || scenario.replications || 1, m.mean, '', '',
      m.confidenceInterval95HalfWidth || 0, '', m.min, m.max
    ].join(','));
  });

  const filename = `gris_tidy_metrics_${sanitizeFilename(scenario.name)}_${Date.now()}.csv`;
  triggerDownload(rows.join('\n'), filename, 'text/csv;charset=utf-8');
}

/**
 * Exports structured executive scenario JSON response payload with formal schema.
 */
export function exportScenarioToJson(scenario) {
  if (!scenario) return;

  const results = scenario.results || {};
  const sampleMetrics = results.sampleMetrics || {};
  const timeWeightedMetrics = results.timeWeightedMetrics || {};
  const counters = results.counters || {};

  const documentPayload = {
    $schema: "https://gris.digitaltwin/schemas/v1/simulation-report.json",
    documentType: "ExecutiveSimulationDecisionReport",
    laboratory: {
      organization: "GRIS Digital Twin Laboratory",
      system: "Gris Discrete-Event Monte Carlo Engine",
      version: "0.1.0",
      exportTimestamp: new Date().toISOString(),
      methodology: "Student-t 95% Two-Sided Confidence Intervals with independent PRNG stream isolation"
    },
    scenario: {
      id: scenario.id || "N/A",
      name: scenario.name || "Untitled Scenario",
      description: scenario.description || "",
      modelType: scenario.modelType || "N/A",
      status: scenario.status || "N/A",
      replications: scenario.replications || 1,
      horizonSeconds: scenario.horizon || 0,
      seedBase: scenario.seedBase || 42,
      createdAt: scenario.createdAt,
      completedAt: scenario.completedAt,
      wallClockMs: scenario.wallClockMs || results.elapsedMillis || 0
    },
    executiveKpis: Object.entries(sampleMetrics).slice(0, 5).map(([name, m]) => ({
      metric: name,
      pointEstimateMean: m.mean,
      confidenceInterval95: {
        lower: m.confidenceInterval95Lower,
        upper: m.confidenceInterval95Upper,
        marginOfErrorHalfWidth: m.confidenceInterval95HalfWidth
      },
      standardDeviation: m.standardDeviation,
      minObserved: m.min,
      maxObserved: m.max
    })),
    parameters: scenario.parameters || {},
    statisticalResults: {
      totalEventsProcessed: results.totalEventsProcessed || 0,
      wallClockMillis: results.wallClockMillis || results.elapsedMillis || 0,
      sampleMetrics,
      timeWeightedMetrics,
      counters,
      eventTraceSampleCount: (results.eventTrace || []).length
    }
  };

  const jsonStr = JSON.stringify(documentPayload, null, 2);
  const filename = `gris_scenario_${sanitizeFilename(scenario.name)}_${Date.now()}.json`;
  triggerDownload(jsonStr, filename, 'application/json;charset=utf-8');
}
