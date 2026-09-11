package org.gris.api.model;

import java.util.List;
import java.util.Map;

public record SweepResponse(
        String id,
        String name,
        String modelType,
        String parameterName,
        String targetMetric,
        Map<String, Object> baseParameters,
        double horizon,
        int replications,
        List<SweepPointResult> points,
        long totalWallClockMs
) {}
