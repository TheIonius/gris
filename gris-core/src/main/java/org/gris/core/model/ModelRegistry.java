package org.gris.core.model;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry for discovering and storing available SimulationModelFactory implementations.
 * Supports manual registration, Spring bean population, and Java ServiceLoader SPI discovery.
 */
public class ModelRegistry {
    private static final Logger log = LoggerFactory.getLogger(ModelRegistry.class);

    private final Map<String, SimulationModelFactory> factories = new ConcurrentHashMap<>();

    public ModelRegistry() {
    }

    public void register(SimulationModelFactory factory) {
        Objects.requireNonNull(factory, "Factory cannot be null");
        factories.put(factory.modelType(), factory);
        log.info("Registered simulation model: '{}' - {}", factory.modelType(), factory.description());
    }

    public Optional<SimulationModelFactory> getFactory(String modelType) {
        return Optional.ofNullable(factories.get(modelType));
    }

    public SimulationModelFactory getRequiredFactory(String modelType) {
        SimulationModelFactory factory = factories.get(modelType);
        if (factory == null) {
            throw new IllegalArgumentException(String.format(
                    "No simulation model registered for type '%s'. Available models: %s",
                    modelType, factories.keySet()));
        }
        return factory;
    }

    public Map<String, SimulationModelFactory> getAllFactories() {
        return Collections.unmodifiableMap(factories);
    }

    public Set<String> getAvailableModelTypes() {
        return Collections.unmodifiableSet(factories.keySet());
    }

    /**
     * Auto-discovers SimulationModelFactory implementations from META-INF/services using ServiceLoader.
     */
    public void discoverViaServiceLoader() {
        ServiceLoader<SimulationModelFactory> loader = ServiceLoader.load(SimulationModelFactory.class);
        for (SimulationModelFactory factory : loader) {
            register(factory);
        }
    }
}
