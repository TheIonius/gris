package org.gris.terminal;

import org.gris.core.engine.ReplicationReport;
import org.gris.core.engine.ReplicationRunner;
import org.gris.core.engine.SimulationEngine;
import org.gris.core.engine.SimulationResult;
import org.gris.core.metrics.AggregatedMetric;
import org.gris.core.metrics.SampleMetric;
import org.gris.core.model.ModelRegistry;
import org.gris.core.model.SimulationModel;
import org.gris.core.model.SimulationModelFactory;
import org.gris.terminal.model.CaucedoTerminalModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

public class CaucedoTerminalValidationTest {

    private static final Logger log = LoggerFactory.getLogger(CaucedoTerminalValidationTest.class);

    @Test
    @DisplayName("ModelRegistry discovers caucedo-terminal via SPI")
    void testModelDiscoveryViaSpi() {
        ModelRegistry registry = new ModelRegistry();
        registry.discoverViaServiceLoader();
        Optional<SimulationModelFactory> factoryOpt = registry.getFactory("caucedo-terminal");

        assertThat(factoryOpt).isPresent();
        SimulationModelFactory factory = factoryOpt.get();
        assertThat(factory.modelType()).isEqualTo("caucedo-terminal");
        assertThat(factory.parameterDefinitions()).containsKeys("berths", "quayCranes", "movesPerHourPerCrane", "cranePolicy", "arrivalRatePerDay");

        SimulationModel model = factory.createModel(Map.of(
                "berths", 3,
                "quayCranes", 8,
                "cranePolicy", "DYNAMIC"
        ));
        assertThat(model).isNotNull();
        assertThat(model.name()).isEqualTo("CaucedoTerminal-DYNAMIC");
    }

    @Test
    @DisplayName("Single Run: Simulates 7 days of DP World Caucedo operations")
    void shouldSimulateSevenDaysOfTerminalOperations() {
        // 7 days = 604,800 seconds
        double duration = 7 * 86400.0;
        CaucedoTerminalModel model = new CaucedoTerminalModel(3, 8, 28.0, "DYNAMIC", 4.0);
        SimulationEngine engine = new SimulationEngine(42L);

        SimulationResult result = engine.run(model, duration);

        log.info("Caucedo 7-day terminal summary: {}", result);
        assertThat(result.eventsProcessed()).isGreaterThan(50);

        // Check metrics
        var metrics = result.metrics();
        assertThat(metrics.getCounter("vessels.arrived")).isGreaterThan(15);
        assertThat(metrics.getCounter("vessels.served")).isGreaterThan(10);
        assertThat(metrics.getCounter("containers.moved")).isGreaterThan(5000);

        SampleMetric turnaroundMetric = metrics.getSampleMetric("vessel.turnaround_time_hours");
        assertThat(turnaroundMetric).isNotNull();
        assertThat(turnaroundMetric.getCount()).isGreaterThan(10);
        log.info("Mean vessel turnaround time: {} hours", turnaroundMetric.getMean());
    }

    @Test
    @DisplayName("Policy Comparison: Dynamic crane allocation reduces vessel turnaround time vs Static allocation")
    void shouldCompareStaticVsDynamicCraneAllocationWithConfidenceIntervals() {
        int replications = 25;
        double horizon = 14 * 86400.0; // 14 days
        double arrivalRate = 4.5; // High demand: 4.5 vessels/day

        ReplicationRunner runner = new ReplicationRunner();

        // 1. Static policy (2 cranes per vessel)
        ReplicationReport staticReport = runner.runReplications(
                () -> new CaucedoTerminalModel(3, 8, 28.0, "STATIC", arrivalRate),
                horizon,
                replications,
                1000L
        );

        // 2. Dynamic policy (size-weighted crane allocation: up to 4 for Post-Panamax)
        ReplicationReport dynamicReport = runner.runReplications(
                () -> new CaucedoTerminalModel(3, 8, 28.0, "DYNAMIC", arrivalRate),
                horizon,
                replications,
                2000L
        );

        AggregatedMetric staticTurnaround = staticReport.getSampleMetric("vessel.turnaround_time_hours");
        AggregatedMetric dynamicTurnaround = dynamicReport.getSampleMetric("vessel.turnaround_time_hours");

        assertThat(staticTurnaround).isNotNull();
        assertThat(dynamicTurnaround).isNotNull();

        log.info("=== DP WORLD CAUCEDO POLICY COMPARISON (14-day horizon, N=25, 95% CI) ===");
        log.info("STATIC  crane allocation mean turnaround: {} hrs [95% CI: {} - {}]",
                String.format("%.2f", staticTurnaround.mean()),
                String.format("%.2f", staticTurnaround.confidenceInterval95Lower()),
                String.format("%.2f", staticTurnaround.confidenceInterval95Upper()));
        log.info("DYNAMIC crane allocation mean turnaround: {} hrs [95% CI: {} - {}]",
                String.format("%.2f", dynamicTurnaround.mean()),
                String.format("%.2f", dynamicTurnaround.confidenceInterval95Lower()),
                String.format("%.2f", dynamicTurnaround.confidenceInterval95Upper()));

        // Dynamic crane allocation should reduce turnaround time
        assertThat(dynamicTurnaround.mean()).isLessThan(staticTurnaround.mean());
    }
}
