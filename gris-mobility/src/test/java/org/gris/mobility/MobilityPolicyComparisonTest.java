package org.gris.mobility;

import org.gris.core.engine.ReplicationReport;
import org.gris.core.engine.ReplicationRunner;
import org.gris.core.engine.SimulationEngine;
import org.gris.core.engine.SimulationResult;
import org.gris.core.metrics.AggregatedMetric;
import org.gris.core.model.SimulationModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MobilityPolicyComparisonTest {

    @Test
    @DisplayName("Single run of NYC urban mobility model completes trips and tracks passenger wait times")
    void testSingleMobilityRun() {
        MobilityModelFactory factory = new MobilityModelFactory();
        SimulationModel model = factory.createModel(Map.of(
                "fleetSize", 200,
                "policy", "NEAREST",
                "demandMultiplier", 1.0
        ));

        SimulationEngine engine = new SimulationEngine(42L);
        // Simulate 2 hours of virtual time (7200 seconds)
        double horizon = 7200.0;
        SimulationResult result = engine.run(model, horizon);

        assertThat(result.eventsProcessed()).isGreaterThan(500);
        assertThat(result.getCounter("trips.requested")).isPositive();
        assertThat(result.getCounter("trips.completed")).isPositive();

        double meanWait = result.getSampleMean("passenger.wait_time");
        assertThat(meanWait).isBetween(30.0, 600.0); // Reasonable urban waiting time

        double fleetUtil = result.getTimeAverage("fleet.utilization");
        assertThat(fleetUtil).isBetween(0.05, 0.95);
    }

    @Test
    @DisplayName("Monte Carlo comparison: compares dispatch strategies with 95% confidence intervals")
    void testPolicyComparisonWithConfidenceIntervals() {
        MobilityModelFactory factory = new MobilityModelFactory();
        double horizon = 5400.0; // 1.5 hours of virtual time
        int replications = 8;
        long baseSeed = 77777L;

        ReplicationRunner runner = new ReplicationRunner();

        // 1. Run Nearest dispatch
        ReplicationReport nearestReport = runner.runReplications(
                () -> factory.createModel(Map.of("fleetSize", 250, "policy", "NEAREST")),
                horizon,
                replications,
                baseSeed
        );

        // 2. Run Batched dispatch
        ReplicationReport batchedReport = runner.runReplications(
                () -> factory.createModel(Map.of("fleetSize", 250, "policy", "BATCHED", "batchWindowSeconds", 15.0)),
                horizon,
                replications,
                baseSeed
        );

        // 3. Run Pre-positioning dispatch
        ReplicationReport prepReport = runner.runReplications(
                () -> factory.createModel(Map.of("fleetSize", 250, "policy", "PREPOSITIONING")),
                horizon,
                replications,
                baseSeed
        );

        AggregatedMetric nearestWait = nearestReport.getSampleMetric("passenger.wait_time");
        AggregatedMetric batchedWait = batchedReport.getSampleMetric("passenger.wait_time");
        AggregatedMetric prepWait = prepReport.getSampleMetric("passenger.wait_time");

        System.out.printf("--- Mobility Policy Comparison (N=%d replications) ---%n", replications);
        System.out.printf("NEAREST        : Mean Wait = %.2fs (95%% CI: +/- %.2fs, range: [%.2fs, %.2fs])%n",
                nearestWait.mean(), nearestWait.confidenceInterval95HalfWidth(), nearestWait.confidenceInterval95Lower(), nearestWait.confidenceInterval95Upper());
        System.out.printf("BATCHED        : Mean Wait = %.2fs (95%% CI: +/- %.2fs, range: [%.2fs, %.2fs])%n",
                batchedWait.mean(), batchedWait.confidenceInterval95HalfWidth(), batchedWait.confidenceInterval95Lower(), batchedWait.confidenceInterval95Upper());
        System.out.printf("PREPOSITIONING : Mean Wait = %.2fs (95%% CI: +/- %.2fs, range: [%.2fs, %.2fs])%n",
                prepWait.mean(), prepWait.confidenceInterval95HalfWidth(), prepWait.confidenceInterval95Lower(), prepWait.confidenceInterval95Upper());

        // Assert all policies produced valid, non-zero confidence intervals and completed trips
        assertThat(nearestWait.confidenceInterval95HalfWidth()).isPositive();
        assertThat(batchedWait.confidenceInterval95HalfWidth()).isPositive();
        assertThat(prepWait.confidenceInterval95HalfWidth()).isPositive();

        assertThat(nearestReport.getCounter("trips.completed").mean()).isGreaterThan(100.0);
        assertThat(batchedReport.getCounter("trips.completed").mean()).isGreaterThan(100.0);
        assertThat(prepReport.getCounter("trips.completed").mean()).isGreaterThan(100.0);
    }
}
