package org.gris.api.model;

/**
 * Real-time replication execution progress for active Monte Carlo runs.
 */
public record ReplicationProgress(
        int completed,
        int total,
        double percent
) {
    public static ReplicationProgress of(int completed, int total) {
        double pct = total > 0 ? Math.min(100.0, Math.max(0.0, ((double) completed / total) * 100.0)) : 0.0;
        return new ReplicationProgress(completed, total, Math.round(pct * 10.0) / 10.0);
    }
}
