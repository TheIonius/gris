import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportScenarioToExcel, exportScenarioToXlsx, exportScenarioToCsv, exportScenarioToTidyCsv, exportScenarioToJson, exportScenarioToPdf } from './reportExporter';

describe('reportExporter', () => {
  let createdBlobs = [];
  let appendedElements = [];

  beforeEach(() => {
    createdBlobs = [];
    appendedElements = [];

    // Mock URL and DOM download triggers
    global.URL.createObjectURL = vi.fn((blob) => {
      createdBlobs.push(blob);
      return 'blob:mock-url';
    });
    global.URL.revokeObjectURL = vi.fn();

    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
      appendedElements.push(el);
      return el;
    });
  });

  const mockScenario = {
    id: 'test-scenario-123',
    name: 'MM1 Ergodic Test',
    modelType: 'mm1-queue',
    status: 'COMPLETED',
    replications: 5,
    horizon: 3600,
    parameters: { lambda: 0.6, mu: 1.0, servers: 1 },
    results: {
      totalEventsProcessed: 12500,
      elapsedMillis: 45,
      sampleMetrics: {
        'customer.wait_time': {
          replications: 5,
          mean: 1.5,
          standardDeviation: 0.1,
          standardError: 0.04,
          variance: 0.01,
          confidenceInterval95Lower: 1.4,
          confidenceInterval95Upper: 1.6,
          confidenceInterval95HalfWidth: 0.1,
          min: 1.35,
          max: 1.65
        }
      },
      timeWeightedMetrics: {
        'server.utilization': {
          replications: 5,
          mean: 0.60,
          standardDeviation: 0.02,
          standardError: 0.008,
          variance: 0.0004,
          confidenceInterval95Lower: 0.58,
          confidenceInterval95Upper: 0.62,
          confidenceInterval95HalfWidth: 0.02,
          min: 0.57,
          max: 0.63
        }
      },
      counters: {
        'customers.served': {
          mean: 2160,
          confidenceInterval95HalfWidth: 15,
          min: 2140,
          max: 2185
        }
      }
    }
  };

  it('exports structured binary Microsoft Excel workbook (.xls)', () => {
    exportScenarioToExcel(mockScenario);
    expect(createdBlobs.length).toBe(1);
    expect(createdBlobs[0].type).toBe('application/vnd.ms-excel');
    expect(appendedElements[0].download).toContain('gris_report_mm1_ergodic_test');
    expect(appendedElements[0].download).toContain('.xls');
  });

  it('exports RFC-4180 CSV with parameter and metric blocks (.csv)', () => {
    exportScenarioToCsv(mockScenario);
    expect(createdBlobs.length).toBe(1);
    expect(createdBlobs[0].type).toBe('text/csv;charset=utf-8');
    expect(appendedElements[0].download).toContain('.csv');
  });

  it('exports modern Microsoft Excel OpenXML workbook (.xlsx)', () => {
    exportScenarioToXlsx(mockScenario);
    expect(createdBlobs.length).toBe(1);
    expect(createdBlobs[0].type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(appendedElements[0].download).toContain('.xlsx');
  });

  it('exports tidy tabular CSV dataset (.csv)', () => {
    exportScenarioToTidyCsv(mockScenario);
    expect(createdBlobs.length).toBe(1);
    expect(createdBlobs[0].type).toBe('text/csv;charset=utf-8');
    expect(appendedElements.some(el => el.download?.includes('tidy'))).toBe(true);
  });

  it('exports structured JSON decision report with formal schema (.json)', () => {
    exportScenarioToJson(mockScenario);
    expect(createdBlobs.length).toBe(1);
    expect(createdBlobs[0].type).toBe('application/json;charset=utf-8');
    expect(appendedElements.some(el => el.download?.endsWith('.json'))).toBe(true);
  });

  it('exports PDF report with cleanly separated footer (.pdf)', () => {
    exportScenarioToPdf(mockScenario);
    expect(createdBlobs.length).toBe(1);
    expect(createdBlobs[0].type).toBe('application/pdf');
    expect(appendedElements.some(el => el.download?.endsWith('.pdf'))).toBe(true);
  });
});
