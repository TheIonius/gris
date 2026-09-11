package org.gris.api.model;

import org.gris.core.model.ModelParameterDefinition;
import org.gris.core.model.SimulationModelFactory;

import java.util.Map;

public record ModelInfoResponse(
        String modelType,
        String description,
        Map<String, ModelParameterDefinition> parameters
) {
    public static ModelInfoResponse from(SimulationModelFactory factory) {
        return new ModelInfoResponse(
                factory.modelType(),
                factory.description(),
                factory.parameterDefinitions()
        );
    }
}
