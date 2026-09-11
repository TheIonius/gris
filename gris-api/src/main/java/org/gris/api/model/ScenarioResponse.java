package org.gris.api.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ScenarioResponse(
        String id,
        String name,
        String description,
        String modelType,
        double horizon,
        int replications,
        long seedBase,
        ScenarioStatus status,
        Map<String, Object> parameters,
        ScenarioResultsResponse results,
        String errorMessage,
        Instant createdAt,
        Instant completedAt,
        Long wallClockMs,
        ReplicationProgress progress
) {
    public ScenarioResponse(
            String id,
            String name,
            String description,
            String modelType,
            double horizon,
            int replications,
            long seedBase,
            ScenarioStatus status,
            Map<String, Object> parameters,
            ScenarioResultsResponse results,
            String errorMessage,
            Instant createdAt,
            Instant completedAt,
            Long wallClockMs
    ) {
        this(id, name, description, modelType, horizon, replications, seedBase, status,
             parameters, results, errorMessage, createdAt, completedAt, wallClockMs,
             status == ScenarioStatus.COMPLETED
                     ? ReplicationProgress.of(replications, replications)
                     : ReplicationProgress.of(0, replications));
    }
}
