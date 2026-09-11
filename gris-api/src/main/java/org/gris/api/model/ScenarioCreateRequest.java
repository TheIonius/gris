package org.gris.api.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.util.Map;

/**
 * Request payload for creating and triggering a new scenario simulation run.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ScenarioCreateRequest(
        @NotBlank(message = "Scenario name is required")
        String name,

        String description,

        @NotBlank(message = "Model type is required (e.g. 'mm1-queue')")
        String modelType,

        @Positive(message = "Simulation horizon must be positive")
        @Max(value = 604800L, message = "Simulation horizon cannot exceed 7 simulated days (604,800s)")
        double horizon,

        @Min(value = 1, message = "Replications count must be at least 1")
        @Max(value = 500, message = "Replications count cannot exceed 500")
        int replications,

        @JsonAlias({"seed", "seedBase"})
        Long seedBase,

        Map<String, Object> parameters
) {
    public ScenarioCreateRequest {
        if (replications <= 0) {
            replications = 10;
        }
        if (seedBase == null) {
            seedBase = 100_000L;
        }
    }
}
