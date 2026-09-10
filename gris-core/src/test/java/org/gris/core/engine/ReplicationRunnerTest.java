package org.gris.core.engine;

import org.gris.core.metrics.AggregatedMetric;
import org.gris.core.model.builtin.MM1ModelFactory;
import org.gris.core.model.builtin.MM1QueueModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class ReplicationRunnerTest {

    @Test
    @DisplayName("ReplicationRunner aggregates Monte Carlo runs and computes valid 95% confidence intervals")
    void testReplicationRunnerWithMM1() {
        double lambda = 0.5;
        double mu = 1.0;
        double horizon = 20_000.0;
        double warmup = 2_000.0;
        int replications = 20;
        long baseSeed = 54321L;

        ReplicationRunner runner = new ReplicationRunner();
        ReplicationReport report = runner.runReplications(
                () -> new MM1QueueModel(lambda, mu, warmup),
                horizon,
                replications,
                baseSeed
        );

        assertThat(report.replications()).isEqualTo(replications);
        assertThat(report.modelName()).isEqualTo("MM1QueueModel");
        assertThat(report.totalEventsProcessed()).isGreaterThan(0);

        // Theoretical expectations
        double theoreticalW = 1.0 / (mu - lambda); // 2.00
        double theoreticalRho = lambda / mu; // 0.50

        // Check system time metric
        AggregatedMetric systemTime = report.getSampleMetric("steady.customer.system_time");
        assertThat(systemTime.replications()).isEqualTo(replications);
        assertThat(systemTime.mean()).isCloseTo(theoreticalW, within(0.08));
        assertThat(theoreticalW)
                .as("95% CI must capture theoretical mean W = 2.00")
                .isBetween(systemTime.confidenceInterval95Lower(), systemTime.confidenceInterval95Upper());

        // Check server utilization
        AggregatedMetric utilization = report.getTimeWeightedMetric("server.utilization");
        assertThat(utilization.mean()).isCloseTo(theoreticalRho, within(0.03));

        // Check counters
        AggregatedMetric arrivals = report.getCounter("customers.arrived");
        assertThat(arrivals.mean()).isGreaterThan(0);
    }

    @Test
    @DisplayName("ReplicationRunner produces bitwise identical reports for identical baseSeed")
    void testDeterministicReplications() {
        MM1ModelFactory factory = new MM1ModelFactory();
        Map<String, Object> params = Map.of("lambda", 0.5, "mu", 1.0, "warmup", 500.0);
        double horizon = 5_000.0;
        int replications = 5;
        long baseSeed = 42L;

        ReplicationRunner runner = new ReplicationRunner();
        ReplicationReport report1 = runner.runReplications(() -> factory.createModel(params), horizon, replications, baseSeed);
        ReplicationReport report2 = runner.runReplications(() -> factory.createModel(params), horizon, replications, baseSeed);

        assertThat(report1.totalEventsProcessed()).isEqualTo(report2.totalEventsProcessed());
        AggregatedMetric m1 = report1.getSampleMetric("steady.customer.system_time");
        AggregatedMetric m2 = report2.getSampleMetric("steady.customer.system_time");

        assertThat(m1.mean()).isEqualTo(m2.mean());
        assertThat(m1.variance()).isEqualTo(m2.variance());
        assertThat(m1.confidenceInterval95HalfWidth()).isEqualTo(m2.confidenceInterval95HalfWidth());
    }
}
