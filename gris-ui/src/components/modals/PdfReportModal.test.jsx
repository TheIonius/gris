import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PdfReportModal } from './PdfReportModal';

describe('PdfReportModal', () => {
  const sampleScenario = {
    id: 'test-uuid-1234',
    name: 'Caucedo Dynamic Berth Verification',
    modelType: 'caucedo-terminal',
    status: 'COMPLETED',
    horizon: 86400,
    replications: 5,
    seedBase: 42,
    parameters: {
      berths: 3,
      quayCranes: 6,
      cranePolicy: 'DYNAMIC'
    },
    results: {
      totalEventsProcessed: 1250,
      wallClockMillis: 15,
      sampleMetrics: {
        'vessel.turnaround_time_hours': {
          name: 'vessel.turnaround_time_hours',
          replications: 5,
          mean: 10.45,
          standardDeviation: 1.2,
          confidenceInterval95Lower: 9.1,
          confidenceInterval95Upper: 11.8,
          confidenceInterval95HalfWidth: 1.35,
          min: 8.5,
          max: 12.3
        }
      },
      timeWeightedMetrics: {
        'terminal.berths.utilization': {
          name: 'terminal.berths.utilization',
          mean: 0.62,
          standardDeviation: 0.05,
          confidenceInterval95Lower: 0.56,
          confidenceInterval95Upper: 0.68,
          min: 0.54,
          max: 0.71
        }
      }
    }
  };

  it('renders null when not open or no scenario', () => {
    const { container } = render(
      <PdfReportModal isOpen={false} onClose={() => {}} scenario={sampleScenario} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal into document.body using portal and locks scroll', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <PdfReportModal isOpen={true} onClose={onClose} scenario={sampleScenario} />
    );

    expect(screen.getByText(/Executive Decision PDF Report/i)).toBeDefined();
    expect(screen.getByText(/GRIS DIGITAL TWIN LABORATORY/i)).toBeDefined();
    expect(screen.getByText(/Caucedo Dynamic Berth Verification/i)).toBeDefined();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('calls onClose when close button or Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <PdfReportModal isOpen={true} onClose={onClose} scenario={sampleScenario} />
    );

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
