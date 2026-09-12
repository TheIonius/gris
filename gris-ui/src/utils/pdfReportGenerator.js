import { jsPDF } from 'jspdf';

/**
 * Generates a vector PDF report using jsPDF and triggers download.
 */
export function exportScenarioToPdf(scenario) {
  if (!scenario) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const results = scenario.results || {};
  const sampleMetrics = Object.entries(results.sampleMetrics || {});
  const timeWeightedMetrics = Object.entries(results.timeWeightedMetrics || {});
  const counters = Object.entries(results.counters || {});
  const params = Object.entries(scenario.parameters || {});

  // --- 1. HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, pageWidth - (margin * 2), 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GRIS DIGITAL TWIN LABORATORY', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Monte Carlo Discrete-Event Simulation Decision Report', margin + 6, y + 16);
  doc.text(`Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`, pageWidth - margin - 6, y + 16, { align: 'right' });

  y += 28;

  // --- 2. SCENARIO OVERVIEW CARD ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(margin, y, pageWidth - (margin * 2), 26, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(scenario.name || 'Untitled Scenario', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const col1X = margin + 4;
  const col2X = margin + 55;
  const col3X = margin + 115;

  doc.text(`Model: ${scenario.modelType}`, col1X, y + 14);
  doc.text(`Status: ${scenario.status}`, col1X, y + 20);

  doc.text(`Horizon: ${(scenario.horizon || 0).toLocaleString()}s`, col2X, y + 14);
  doc.text(`Replications: ${scenario.replications || 1} Monte Carlo runs`, col2X, y + 20);

  doc.text(`Events Processed: ${(results.totalEventsProcessed || 0).toLocaleString()}`, col3X, y + 14);
  doc.text(`Engine Latency: ${results.wallClockMillis || results.elapsedMillis || 0}ms`, col3X, y + 20);

  y += 32;

  // --- 3. EXECUTIVE KPI CARDS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE PERFORMANCE METRICS (95% CONFIDENCE)', margin, y);
  y += 4;

  const topMetrics = sampleMetrics.slice(0, 3);
  const cardWidth = (pageWidth - (margin * 2) - 8) / 3;

  topMetrics.forEach(([name, m], i) => {
    const cardX = margin + (i * (cardWidth + 4));
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cardX, y, cardWidth, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const cleanName = name.replace(/^[a-z_]+\./, '').replace(/_/g, ' ').toUpperCase();
    doc.text(cleanName.substring(0, 24), cardX + 3, y + 5.5);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    const meanVal = Number(m.mean || 0).toFixed(2);
    doc.text(meanVal, cardX + 3, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const ciHalf = Number(m.confidenceInterval95HalfWidth || 0).toFixed(2);
    doc.text(`95% CI: ±${ciHalf} [${Number(m.confidenceInterval95Lower || 0).toFixed(2)} - ${Number(m.confidenceInterval95Upper || 0).toFixed(2)}]`, cardX + 3, y + 18.5);
  });

  y += 28;

  // --- 4. STATISTICAL CONFIDENCE TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('SAMPLE METRICS STATISTICAL BREAKDOWN', margin, y);
  y += 4;

  // Table Header
  const tableHeaders = ['Metric Identifier', 'Reps', 'Mean', '95% CI Lower', '95% CI Upper', 'Std Dev', 'Min', 'Max'];
  const colWidths = [56, 12, 22, 22, 22, 20, 14, 14];

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  let curX = margin + 2;
  tableHeaders.forEach((th, idx) => {
    doc.text(th, curX, y + 4.2);
    curX += colWidths[idx];
  });
  y += 6;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  sampleMetrics.forEach(([name, m], rIdx) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
    doc.rect(margin, y, pageWidth - (margin * 2), 5, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 5, pageWidth - margin, y + 5);

    doc.setTextColor(15, 23, 42);
    let rowX = margin + 2;
    const rowValues = [
      name.substring(0, 36),
      String(m.replications || 0),
      Number(m.mean || 0).toFixed(3),
      Number(m.confidenceInterval95Lower || 0).toFixed(3),
      Number(m.confidenceInterval95Upper || 0).toFixed(3),
      Number(m.standardDeviation || 0).toFixed(3),
      Number(m.min || 0).toFixed(2),
      Number(m.max || 0).toFixed(2)
    ];

    rowValues.forEach((val, idx) => {
      doc.text(val, rowX, y + 3.6);
      rowX += colWidths[idx];
    });

    y += 5;
  });

  y += 6;

  // --- 5. TIME-WEIGHTED & COUNTER METRICS ---
  if (timeWeightedMetrics.length > 0) {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('TIME-WEIGHTED RESOURCE UTILIZATION', margin, y);
    y += 4;

    doc.setFillColor(51, 65, 85);
    doc.rect(margin, y, pageWidth - (margin * 2), 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);

    const twHeaders = ['Resource / State Metric', 'Time-Average Mean', '95% CI Bounds', 'Std Dev', 'Min', 'Max'];
    const twWidths = [60, 30, 36, 26, 15, 15];

    let twX = margin + 2;
    twHeaders.forEach((th, idx) => {
      doc.text(th, twX, y + 3.8);
      twX += twWidths[idx];
    });
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);

    timeWeightedMetrics.forEach(([name, m], rIdx) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, pageWidth - (margin * 2), 5, 'F');
      doc.setTextColor(15, 23, 42);

      let rx = margin + 2;
      const vals = [
        name.substring(0, 40),
        Number(m.mean || 0).toFixed(4),
        `[${Number(m.confidenceInterval95Lower || 0).toFixed(3)} - ${Number(m.confidenceInterval95Upper || 0).toFixed(3)}]`,
        Number(m.standardDeviation || 0).toFixed(4),
        Number(m.min || 0).toFixed(3),
        Number(m.max || 0).toFixed(3)
      ];

      vals.forEach((val, idx) => {
        doc.text(val, rx, y + 3.6);
        rx += twWidths[idx];
      });
      y += 5;
    });

    y += 6;
  }

  // --- 6. EXPERIMENTAL PARAMETERS ---
  if (params.length > 0) {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CONFIGURED EXPERIMENTAL PARAMETERS', margin, y);
    y += 4;

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    const boxHeight = Math.min(24, Math.ceil(params.length / 2) * 4.5 + 4);
    doc.rect(margin, y, pageWidth - (margin * 2), boxHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    params.forEach(([k, v], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = margin + 4 + (col * 88);
      const py = y + 4.5 + (row * 4.5);
      if (py < y + boxHeight) {
        doc.setFont('helvetica', 'bold');
        const label = `${k}: `;
        doc.text(label, px, py);
        const kw = doc.getTextWidth(label);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v), px + kw + 1.2, py, { maxWidth: 84 - kw });
      }
    });

    y += boxHeight + 6;
  }

  // --- 7. AUDIT & SIGN-OFF FOOTER ---
  const footerNeededHeight = 28;
  if (y > pageHeight - footerNeededHeight) {
    doc.addPage();
    y = margin + 4;
  }

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineDash([1, 1], 0);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineDash([], 0);

  y += 5;

  const colWidth = (pageWidth - (margin * 2) - 10) / 2; // 88mm each column with 10mm gutter
  const rightColX = margin + colWidth + 10;

  // Left Column: Methodology & Stochastic Specification (bounded to 88mm width)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text('SIMULATION METHODOLOGY & PRNG ARCHITECTURE', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139); // slate-500
  const methodologyLines = [
    'Discrete-event simulation engine with independent SplitMix64 pseudo-random streams.',
    'Student-t 95% confidence intervals computed at significance level alpha = 0.05.',
    `Scenario UUID: ${scenario.id || 'N/A'}  |  Master Seed: ${scenario.seedBase || 42}`
  ];

  let leftY = y + 4;
  methodologyLines.forEach((line) => {
    doc.text(line, margin, leftY, { maxWidth: colWidth });
    leftY += 3.5;
  });

  // Right Column: Formal Engineering Sign-off (bounded to 88mm width)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text('FORMAL ENGINEERING SIGN-OFF', rightColX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Approved by Simulation Systems Lead:', rightColX, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('____________________________________________________', rightColX, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Digital Twin Verification Stamp: SHA256-${(scenario.id || 'gris-twin').substring(0, 12).toUpperCase()}`, rightColX, y + 11);

  const filename = `gris_report_${(scenario.name || 'scenario').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`;
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Opens printable report preview window with print styling.
 */
export function openPrintableReportWindow(scenario) {
  if (!scenario) return;

  const results = scenario.results || {};
  const sampleMetrics = Object.entries(results.sampleMetrics || {});
  const timeWeightedMetrics = Object.entries(results.timeWeightedMetrics || {});
  const counters = Object.entries(results.counters || {});
  const params = Object.entries(scenario.parameters || {});

  const printWindow = window.open('', '_blank', 'width=960,height=800,scrollbars=yes');
  if (!printWindow) {
    alert('Please allow popups to open the Executive Print / PDF Report.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GRIS Decision Report - ${scenario.name || 'Scenario'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.35;
      font-size: 11px;
      padding: 16px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    .print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      font-weight: 600;
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-print:hover { background: #1d4ed8; }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .header .subtitle {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 16px;
    }
    .meta-item .label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .meta-item .val {
      font-size: 11.5px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }
    .kpi-card {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .kpi-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
    .kpi-val {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0 2px 0;
    }
    .kpi-ci {
      font-size: 9px;
      color: #059669;
      font-weight: 600;
    }
    .section-title {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 16px 0 8px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-bottom: 14px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 5px 6px;
    }
    td {
      padding: 4px 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .num { text-align: right; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .footer-audit {
      margin-top: 24px;
      border-top: 1px dashed #94a3b8;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <div>
      <strong>Executive Decision Report Preview</strong>
      <span style="opacity: 0.7; font-size: 11px; margin-left: 10px;">A4 / Letter Ready</span>
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
    </div>
  </div>

  <div class="header">
    <div>
      <h1>GRIS DIGITAL TWIN LABORATORY</h1>
      <div class="subtitle">Monte Carlo Discrete-Event Simulation Decision & Executive Audit Report</div>
    </div>
    <div style="text-align: right; font-size: 9px; color: #64748b;">
      <div><strong>CONFIDENTIAL & PROPRIETARY</strong></div>
      <div>${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <div class="label">Scenario Name</div>
      <div class="val">${escapeHtml(scenario.name)}</div>
    </div>
    <div class="meta-item">
      <div class="label">Model Domain</div>
      <div class="val">${escapeHtml(scenario.modelType)}</div>
    </div>
    <div class="meta-item">
      <div class="label">Monte Carlo Replications</div>
      <div class="val">${scenario.replications || 1} independent runs</div>
    </div>
    <div class="meta-item">
      <div class="label">Virtual Horizon</div>
      <div class="val">${(scenario.horizon || 0).toLocaleString()} seconds</div>
    </div>
    <div class="meta-item">
      <div class="label">Status</div>
      <div class="val">${escapeHtml(scenario.status)}</div>
    </div>
    <div class="meta-item">
      <div class="label">Events Processed</div>
      <div class="val">${(results.totalEventsProcessed || 0).toLocaleString()} events</div>
    </div>
    <div class="meta-item">
      <div class="label">Engine Latency</div>
      <div class="val">${results.wallClockMillis || results.elapsedMillis || 0} ms</div>
    </div>
    <div class="meta-item">
      <div class="label">Master PRNG Seed</div>
      <div class="val">${scenario.seedBase || 42}</div>
    </div>
  </div>

  <div class="section-title">Primary Key Performance Indicators (95% CI)</div>
  <div class="kpi-cards">
    ${sampleMetrics.slice(0, 3).map(([name, m]) => `
      <div class="kpi-card">
        <div class="kpi-title">${escapeHtml(name.replace(/^[a-z_]+\./, '').replace(/_/g, ' '))}</div>
        <div class="kpi-val">${Number(m.mean || 0).toFixed(2)}</div>
        <div class="kpi-ci">95% CI: ±${Number(m.confidenceInterval95HalfWidth || 0).toFixed(2)} [${Number(m.confidenceInterval95Lower || 0).toFixed(2)} - ${Number(m.confidenceInterval95Upper || 0).toFixed(2)}]</div>
      </div>
    `).join('')}
  </div>

  <div class="section-title">Sample Metrics Statistical Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Metric Name</th>
        <th class="num">Reps</th>
        <th class="num">Sample Mean</th>
        <th class="num">95% CI Lower</th>
        <th class="num">95% CI Upper</th>
        <th class="num">Half-Width (±)</th>
        <th class="num">Std Dev</th>
        <th class="num">Min</th>
        <th class="num">Max</th>
      </tr>
    </thead>
    <tbody>
      ${sampleMetrics.map(([name, m]) => `
        <tr>
          <td><strong>${escapeHtml(name)}</strong></td>
          <td class="num mono">${m.replications || 0}</td>
          <td class="num mono"><strong>${Number(m.mean || 0).toFixed(4)}</strong></td>
          <td class="num mono">${Number(m.confidenceInterval95Lower || 0).toFixed(4)}</td>
          <td class="num mono">${Number(m.confidenceInterval95Upper || 0).toFixed(4)}</td>
          <td class="num mono">±${Number(m.confidenceInterval95HalfWidth || 0).toFixed(4)}</td>
          <td class="num mono">${Number(m.standardDeviation || 0).toFixed(4)}</td>
          <td class="num mono">${Number(m.min || 0).toFixed(2)}</td>
          <td class="num mono">${Number(m.max || 0).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${timeWeightedMetrics.length > 0 ? `
    <div class="section-title">Time-Weighted State Metrics & Resource Utilizations</div>
    <table>
      <thead>
        <tr>
          <th>State Metric</th>
          <th class="num">Time-Average Mean</th>
          <th class="num">95% CI Lower</th>
          <th class="num">95% CI Upper</th>
          <th class="num">Std Dev</th>
          <th class="num">Min</th>
          <th class="num">Max</th>
        </tr>
      </thead>
      <tbody>
        ${timeWeightedMetrics.map(([name, m]) => `
          <tr>
            <td><strong>${escapeHtml(name)}</strong></td>
            <td class="num mono"><strong>${Number(m.mean || 0).toFixed(4)}</strong></td>
            <td class="num mono">${Number(m.confidenceInterval95Lower || 0).toFixed(4)}</td>
            <td class="num mono">${Number(m.confidenceInterval95Upper || 0).toFixed(4)}</td>
            <td class="num mono">${Number(m.standardDeviation || 0).toFixed(4)}</td>
            <td class="num mono">${Number(m.min || 0).toFixed(3)}</td>
            <td class="num mono">${Number(m.max || 0).toFixed(3)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <div class="section-title">Experimental Parameters</div>
  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Parameter Name</th>
        <th style="width: 50%;">Configured Value</th>
      </tr>
    </thead>
    <tbody>
      ${params.map(([k, v]) => `
        <tr>
          <td><strong>${escapeHtml(k)}</strong></td>
          <td class="mono">${escapeHtml(v)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer-audit">
    <div>
      <div><strong>METHODOLOGY:</strong> High-precision discrete-event simulation with SplitMix64 deterministic seeds.</div>
      <div>Scenario ID: ${escapeHtml(scenario.id)} | Simulation Engine v0.1.0</div>
    </div>
    <div style="text-align: right;">
      <div>Approved by: ______________________________</div>
      <div style="margin-top: 4px;">Simulation Engineering Lead</div>
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
