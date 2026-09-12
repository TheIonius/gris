import React from 'react';
import { Layers, Car, Anchor } from 'lucide-react';

const MODELS = [
  {
    id: 'mm1-queue',
    title: 'M/M/1 Queueing System',
    badge: 'Analytical Bedrock',
    Icon: Layers,
    desc: 'Poisson arrivals, exponential service, deterministic calendar, and closed-form theoretical validation.',
  },
  {
    id: 'mobility-dispatch',
    title: 'NYC Mobility Dispatch',
    badge: 'Urban Fleet',
    Icon: Car,
    desc: 'NYC TLC calibrated taxi zones with Nearest, Batched (bipartite matching), and Prepositioning policies.',
  },
  {
    id: 'caucedo-terminal',
    title: 'DP World Caucedo Terminal',
    badge: 'Container Logistics',
    Icon: Anchor,
    desc: 'Deep-sea container port operations with berths, quay cranes, and Static vs Dynamic crane allocation.',
  },
];

export function ModelTabs({ activeModel, onSelectModel }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
      {MODELS.map((model) => {
        const isActive = activeModel === model.id;
        const IconComponent = model.Icon;

        return (
          <button
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            style={{
              background: isActive ? '#ffffff' : '#ffffff',
              border: `1px solid ${isActive ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'border-color 0.1s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconComponent size={15} style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                  {model.title}
                </span>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                {model.badge}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {model.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
