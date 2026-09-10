package org.gris.core.model;

import java.util.Map;

/**
 * Service Provider Interface (SPI) for simulation model factories.
 * Domain models (e.g. mobility dispatch, container terminal, queueing networks)
 * implement this factory interface so the engine and API can discover them dynamically.
 */
public interface SimulationModelFactory {

    /**
     * Unique identifier for this model type (e.g., "mm1-queue", "mobility-dispatch", "container-terminal").
     */
    String modelType();

    /**
     * Human-readable description of the domain model and what phenomena it studies.
     */
    String description();

    /**
     * Declares the parameter schema accepted by this model.
     */
    Map<String, ModelParameterDefinition> parameterDefinitions();

    /**
     * Instantiates a new, uninitialized SimulationModel configured with the given parameters.
     *
     * @param parameters key-value map of configuration arguments
     * @return a fresh SimulationModel instance ready for execution
     */
    SimulationModel createModel(Map<String, Object> parameters);
}
