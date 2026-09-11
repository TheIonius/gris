package org.gris.api.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record SweepRequest(
        @NotBlank(message = "Sweep title is required")
        String name,

        @NotBlank(message = "Model type is required")
        String modelType,

        @NotBlank(message = "Sweep parameter name is required")
        String parameterName,

        @NotEmpty(message = "Parameter values list must not be empty")
        @Size(max = 50, message = "Parameter values cannot exceed 50 points")
        List<Double> parameterValues,

        Map<String, Object> baseParameters,

        @Positive(message = "Simulation horizon must be positive")
        @Max(value = 604800L, message = "Simulation horizon cannot exceed 7 simulated days (604,800s)")
        double horizon,

        @Min(value = 1, message = "Replications count must be at least 1")
        @Max(value = 100, message = "Sweep replications cannot exceed 100")
        int replications,

        long seedBase,

        @NotBlank(message = "Target metric name is required")
        String targetMetric
) {}
