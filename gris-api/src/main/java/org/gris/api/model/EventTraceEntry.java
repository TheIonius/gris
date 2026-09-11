package org.gris.api.model;

/**
 * Snapshot of a discrete event dispatched from the event calendar.
 * Captures deterministic ordering metadata and domain state for auditing.
 */
public record EventTraceEntry(
        long sequenceId,
        double time,
        int priority,
        String type,
        String description
) {}
