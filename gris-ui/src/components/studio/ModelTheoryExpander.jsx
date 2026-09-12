import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

export function ModelTheoryExpander({ activeModel }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="panel" style={{ marginTop: '14px', background: '#ffffff', border: '1px solid var(--border-subtle)' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={14} style={{ color: 'var(--text-secondary)' }} />
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Model Theory & Governing Mathematical Formulations
          </h3>
          <span className="badge badge-neutral font-mono" style={{ fontSize: '10.5px' }}>
            {activeModel}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          <span>{isOpen ? 'Collapse Theory' : 'View Equations & Assumptions'}</span>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {isOpen && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          {activeModel === 'mm1-queue' && (
            <div>
              <p style={{ marginBottom: '8px' }}>
                The <strong>M/M/c Queueing Model</strong> follows Kendall's notation representing Poisson arrivals (<span className="font-mono">M</span>), exponential service times (<span className="font-mono">M</span>), and <span className="font-mono">c</span> identical parallel servers with a first-in, first-out (FIFO) queue buffer.
              </p>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Governing Equations:</div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>Traffic Intensity</strong>: <code className="font-mono">ρ = λ / (c · μ)</code>. The system is ergodic and stationary if and only if <code className="font-mono">ρ &lt; 1</code>.</li>
                  <li><strong>Little's Law</strong>: <code className="font-mono">L = λ · W</code> (mean customers in system equals arrival rate times mean system time).</li>
                  <li><strong>Mean Queue Length</strong>: <code className="font-mono">L_q = λ · W_q</code>.</li>
                  <li><strong>Theoretical M/M/1 System Time</strong>: <code className="font-mono">W = 1 / (μ - λ)</code>.</li>
                  <li><strong>Theoretical M/M/1 Waiting Time</strong>: <code className="font-mono">W_q = λ / (μ · (μ - λ))</code>.</li>
                </ul>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Verification Note: Gris uses this analytical closed-form solution to mathematically validate simulation engine convergence within the empirical 95% Student-t confidence interval.
              </p>
            </div>
          )}

          {activeModel === 'mobility-dispatch' && (
            <div>
              <p style={{ marginBottom: '8px' }}>
                The <strong>NYC Urban Mobility & Taxi Dispatch Model</strong> simulates vehicle fleet movement across 11 core NYC Taxi & Limousine Commission (TLC) zones in Manhattan, Brooklyn, Queens, and major airports (JFK, LGA).
              </p>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Dispatch Strategies:</div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>NEAREST (Greedy)</strong>: Dispatches the nearest idle vehicle immediately using Haversine centroid travel distance. Minimizes pickup delay for individual trips but risks spatial starvation in outer zones.</li>
                  <li><strong>BATCHED (Window Optimization)</strong>: Buffers requests in a configurable window (e.g. 20s) and solves bipartite matching to minimize aggregate deadhead mileage.</li>
                  <li><strong>PREPOSITIONING</strong>: Anticipates diurnal demand surges using historical TLC curves, proactively relocating idle vehicles to high-density zones.</li>
                </ul>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Passenger Reneging: Requests with dispatch delay exceeding <span className="font-mono">maxWaitTolerance</span> are cancelled by the customer, measuring service unfulfillment rates.
              </p>
            </div>
          )}

          {activeModel === 'caucedo-terminal' && (
            <div>
              <p style={{ marginBottom: '8px' }}>
                The <strong>DP World Caucedo Terminal Logistics Model</strong> simulates container vessel berthing, quay crane assignment, and container discharge operations at the Dominican Republic's primary deepwater transshipment port.
              </p>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Logistics Formulations:</div>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><strong>Berth Allocation Problem (BAP)</strong>: FIFO anchorage queueing with draft constraints and tug piloting delays.</li>
                  <li><strong>Quay Crane Scheduling (QCSP)</strong>: Dynamic crane allocation based on vessel TEU cargo volume versus fixed 2-cranes-per-berth policy.</li>
                  <li><strong>Container Handling Discharge Rate</strong>: Calculated in Gross Crane Moves Per Hour (GMPH), typically 26-32 GMPH per STS crane.</li>
                </ul>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Turnaround KPI: Vessel turnaround time comprises anchorage wait time, mooring maneuvering, cargo discharge, and unberthing clearance.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
