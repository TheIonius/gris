import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header component', () => {
  it('renders the brand name Gris and navigation tabs', () => {
    render(
      <Header
        models={[{ modelType: 'mm1-queue' }, { modelType: 'mobility-dispatch' }]}
        isConnected={true}
        activeView="studio"
        onChangeView={() => {}}
        onOpenAskGris={() => {}}
        onOpenSweep={() => {}}
        onOpenDocs={() => {}}
        onOpenTelemetry={() => {}}
        onOpenShortcuts={() => {}}
      />
    );

    expect(screen.getByText('Gris')).toBeDefined();
    expect(screen.getByText('Studio / Model')).toBeDefined();
    expect(screen.getByText('Results & Twin')).toBeDefined();
    expect(screen.getByText('Comparison')).toBeDefined();
    expect(screen.getByText('2 Models Ready')).toBeDefined();
  });
});
