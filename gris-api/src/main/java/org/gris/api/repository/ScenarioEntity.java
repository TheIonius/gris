package org.gris.api.repository;

import org.gris.api.model.ScenarioStatus;

import java.time.Instant;

public record ScenarioEntity(
        String id,
        String name,
        String description,
        String modelType,
        double horizon,
        int replications,
        long seedBase,
        ScenarioStatus status,
        String parametersJson,
        String resultsJson,
        String errorMessage,
        Instant createdAt,
        Instant completedAt,
        Long wallClockMs
) {
}
