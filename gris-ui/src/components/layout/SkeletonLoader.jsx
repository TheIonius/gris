import React from 'react';

export function SkeletonBox({ width = '100%', height = '16px', borderRadius = '4px', style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

export function SkeletonResults() {
  return (
    <div className="panel animate-fade-in" style={{ marginBottom: '20px' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: '45%' }}>
          <SkeletonBox width="60%" height="22px" style={{ marginBottom: '8px' }} />
          <SkeletonBox width="90%" height="13px" />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <SkeletonBox width="70px" height="28px" />
          <SkeletonBox width="70px" height="28px" />
          <SkeletonBox width="80px" height="28px" />
        </div>
      </div>

      {/* KPI 4-Card Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '18px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel-elevated">
            <SkeletonBox width="50%" height="11px" style={{ marginBottom: '8px' }} />
            <SkeletonBox width="70%" height="22px" style={{ marginBottom: '6px' }} />
            <SkeletonBox width="40%" height="11px" />
          </div>
        ))}
      </div>

      {/* Diagnostic Card Skeleton */}
      <div className="panel" style={{ marginBottom: '18px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <SkeletonBox width="35%" height="16px" />
          <SkeletonBox width="20%" height="16px" />
        </div>
        <SkeletonBox width="85%" height="13px" style={{ marginBottom: '6px' }} />
        <SkeletonBox width="60%" height="13px" />
      </div>

      {/* Digital Twin Canvas Skeleton */}
      <div className="panel" style={{ marginBottom: '18px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <SkeletonBox width="30%" height="16px" />
          <SkeletonBox width="25%" height="14px" />
        </div>
        <SkeletonBox width="100%" height="180px" borderRadius="6px" />
      </div>

      {/* Sample Metrics Grid Skeleton */}
      <SkeletonBox width="280px" height="15px" style={{ marginBottom: '12px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel-elevated">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <SkeletonBox width="55%" height="14px" />
              <SkeletonBox width="25%" height="12px" />
            </div>
            <SkeletonBox width="40%" height="20px" style={{ marginBottom: '10px' }} />
            <SkeletonBox width="100%" height="8px" borderRadius="4px" style={{ marginBottom: '8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <SkeletonBox width="30%" height="10px" />
              <SkeletonBox width="30%" height="10px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonHistory() {
  return (
    <div className="panel animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <SkeletonBox width="180px" height="18px" style={{ marginBottom: '6px' }} />
          <SkeletonBox width="240px" height="12px" />
        </div>
        <SkeletonBox width="80px" height="28px" />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <SkeletonBox width="320px" height="28px" />
        <SkeletonBox width="100%" height="28px" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <SkeletonBox width="20px" height="16px" />
            <SkeletonBox width="30%" height="15px" />
            <SkeletonBox width="15%" height="15px" />
            <SkeletonBox width="10%" height="15px" />
            <SkeletonBox width="15%" height="15px" />
            <SkeletonBox width="10%" height="15px" />
            <SkeletonBox width="10%" height="15px" />
          </div>
        ))}
      </div>
    </div>
  );
}
