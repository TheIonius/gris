import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScenarioForm } from './ScenarioForm';

describe('ScenarioForm component', () => {
  it('renders presets and input fields for mm1-queue', () => {
    render(
      <ScenarioForm
        activeModel="mm1-queue"
        initialParams={null}
        onSubmit={() => {}}
        isRunning={false}
      />
    );

    expect(screen.getByText(/Scenario Formulation & Workbench/i)).toBeDefined();
    expect(screen.getAllByText(/Default Baseline/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Heavy Traffic/i)).toBeDefined();
    expect(screen.getByText(/Multi-Server M\/M\/2/i)).toBeDefined();
    expect(screen.getByText(/Supercritical/i)).toBeDefined();
  });
});
