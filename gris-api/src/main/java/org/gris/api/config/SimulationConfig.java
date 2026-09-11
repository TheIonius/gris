package org.gris.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.gris.core.engine.ReplicationRunner;
import org.gris.core.model.ModelRegistry;
import org.gris.core.model.SimulationModelFactory;
import org.gris.core.model.builtin.MM1ModelFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.Executors;

@Configuration
public class SimulationConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }

    @Bean
    public MM1ModelFactory mm1ModelFactory() {
        return new MM1ModelFactory();
    }

    @Bean
    public org.gris.mobility.MobilityModelFactory mobilityModelFactory() {
        return new org.gris.mobility.MobilityModelFactory();
    }

    @Bean
    public org.gris.terminal.TerminalModelFactory terminalModelFactory() {
        return new org.gris.terminal.TerminalModelFactory();
    }

    @Bean
    public ModelRegistry modelRegistry(List<SimulationModelFactory> factories) {
        ModelRegistry registry = new ModelRegistry();
        for (SimulationModelFactory factory : factories) {
            registry.register(factory);
        }
        registry.discoverViaServiceLoader();
        return registry;
    }

    @Bean
    public ReplicationRunner replicationRunner(@Value("${gris.simulation.threads:4}") int threads) {
        ProgressTrackingExecutorService trackingExecutor = new ProgressTrackingExecutorService(
                Executors.newFixedThreadPool(threads)
        );
        return new ReplicationRunner(trackingExecutor);
    }

    @Bean
    public org.gris.nl.parser.ScenarioPromptParser scenarioPromptParser() {
        return new org.gris.nl.parser.LlmPromptParser();
    }
}
