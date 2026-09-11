package org.gris.api.model;

import java.util.List;

public record SweepPointResult(
        double parameterValue,
        int replications,
        double mean,
        double variance,
        double standardDeviation,
        double standardError,
        double ciLower,
        double ciUpper,
        double ciHalfWidth,
        double min,
        double max,
        List<Double> replicationValues,
        long totalEvents,
        long wallClockMs
) {
    public SweepPointResult {
        if (replicationValues == null) {
            replicationValues = List.of();
        }
    }
}
