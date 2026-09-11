package org.gris.core.validation;

import org.gris.core.engine.SimulationEngine;
import org.gris.core.engine.SimulationResult;
import org.gris.core.metrics.SampleMetric;
import org.gris.core.model.Entity;
import org.gris.core.model.Event;
import org.gris.core.model.SimulationContext;
import org.gris.core.model.SimulationModel;
import org.gris.core.random.RngStream;
import org.gris.core.resource.ResourceLease;
import org.gris.core.resource.ResourcePool;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Analytical closed-form queueing theory validation for an M/M/1 queue.
 * <p>
 * System parameters:
 * - Arrival rate lambda = 0.5 (Poisson arrival process)
 * - Service rate mu = 1.0 (Exponential service distribution)
 * - Number of servers c = 1
 * <p>
 * Theoretical steady-state expectations:
 * - Server utilization: rho = lambda / mu = 0.50
 * - Mean waiting time in queue: W_q = lambda / (mu * (mu - lambda)) = 1.00
 * - Mean time in system: W = 1 / (mu - lambda) = 2.00
 * - Service time: S = 1 / mu = 1.00
 */
class MM1QueueValidationTest {

    @Test
    @DisplayName("Single long-run M/M/1 converges to closed-form analytical W = 1 / (mu - lambda)")
    void testMM1SingleLongRunConvergence() {
        double lambda = 0.5;
        double mu = 1.0;
        double horizon = 120_000.0;
        double warmupTime = 5_000.0;
        long masterSeed = 987654321L;

        MM1QueueModel model = new MM1QueueModel(lambda, mu, warmupTime);
        SimulationEngine engine = new SimulationEngine(masterSeed);

        SimulationResult result = engine.run(model, horizon);

        // Theoretical values
        double theoreticalRho = lambda / mu; // 0.50
        double theoreticalWq = lambda / (mu * (mu - lambda)); // 1.00
        double theoreticalW = 1.0 / (mu - lambda); // 2.00

        // Simulated values
        SampleMetric systemTimeMetric = result.metrics().getSampleMetric("steady.customer.system_time");
        SampleMetric queueWaitMetric = result.metrics().getSampleMetric("steady.customer.queue_wait");

        double simulatedW = systemTimeMetric.getMean();
        double simulatedWq = queueWaitMetric.getMean();
        double simulatedRho = result.getTimeAverage("server.utilization");

        System.out.printf("--- Single Long Run (Horizon=%.0f) ---%n", horizon);
        System.out.printf("Theoretical W   : %.4f | Simulated W   : %.4f (95%% CI: +/- %.4f)%n",
                theoreticalW, simulatedW, systemTimeMetric.getConfidenceInterval95());
        System.out.printf("Theoretical W_q : %.4f | Simulated W_q : %.4f (95%% CI: +/- %.4f)%n",
                theoreticalWq, simulatedWq, queueWaitMetric.getConfidenceInterval95());
        System.out.printf("Theoretical rho : %.4f | Simulated rho : %.4f%n", theoreticalRho, simulatedRho);
        System.out.printf("Total customers served in steady state: %d%n", systemTimeMetric.getCount());

        // Assert convergence within tight tolerance
        assertThat(simulatedW)
                .as("Simulated mean time in system W must converge to theoretical W = 1 / (mu - lambda)")
                .isCloseTo(theoreticalW, within(0.12));

        assertThat(simulatedWq)
                .as("Simulated mean wait in queue W_q must converge to theoretical W_q")
                .isCloseTo(theoreticalWq, within(0.12));

        assertThat(simulatedRho)
                .as("Simulated server utilization must converge to lambda / mu")
                .isCloseTo(theoreticalRho, within(0.02));

        // Analytical consistency: W = W_q + 1/mu
        assertThat(simulatedW - simulatedWq)
                .as("Difference between system wait and queue wait must equal mean service time (1/mu = 1.0)")
                .isCloseTo(1.0 / mu, within(0.03));
    }

    @Test
    @DisplayName("Monte Carlo independent replications construct valid 95% confidence interval covering analytical W")
    void testMM1MonteCarloReplications() {
        double lambda = 0.5;
        double mu = 1.0;
        double horizon = 25_000.0;
        double warmupTime = 2_000.0;
        int replications = 25;

        double theoreticalW = 1.0 / (mu - lambda); // 2.00
        List<Double> repMeans = new ArrayList<>(replications);

        for (int r = 0; r < replications; r++) {
            long seed = 100_000L + r * 7919L;
            MM1QueueModel model = new MM1QueueModel(lambda, mu, warmupTime);
            SimulationEngine engine = new SimulationEngine(seed);
            SimulationResult result = engine.run(model, horizon);
            SampleMetric metric = result.metrics().getSampleMetric("steady.customer.system_time");
            repMeans.add(metric.getMean());
        }

        // Compute grand mean across independent replications
        double sum = 0.0;
        for (double m : repMeans) {
            sum += m;
        }
        double grandMean = sum / replications;

        // Sample variance across replications
        double varianceSum = 0.0;
        for (double m : repMeans) {
            varianceSum += Math.pow(m - grandMean, 2);
        }
        double repVariance = varianceSum / (replications - 1);
        double stdError = Math.sqrt(repVariance / replications);
        // Student-t critical value for df = 24 at alpha = 0.05 is ~2.064
        double tCrit = 2.064;
        double halfWidth = tCrit * stdError;

        double ciLower = grandMean - halfWidth;
        double ciUpper = grandMean + halfWidth;

        System.out.printf("--- Monte Carlo Replications (R=%d) ---%n", replications);
        System.out.printf("Theoretical W : %.4f%n", theoreticalW);
        System.out.printf("Grand Mean W  : %.4f%n", grandMean);
        System.out.printf("95%% CI        : [%.4f, %.4f] (half-width: +/- %.4f)%n", ciLower, ciUpper, halfWidth);

        // Theoretical value MUST fall within the 95% Confidence Interval
        assertThat(theoreticalW)
                .as("Analytical W = 1 / (mu - lambda) must be captured by the 95% Monte Carlo confidence interval")
                .isBetween(ciLower, ciUpper);

        assertThat(grandMean)
                .as("Grand mean across replications must be within 0.06 of theoretical W")
                .isCloseTo(theoreticalW, within(0.06));
    }

    private static class MM1QueueModel implements SimulationModel {
        private final double lambda;
        private final double mu;
        private final double warmupTime;

        private ResourcePool serverPool;
        private RngStream arrivalStream;
        private RngStream serviceStream;

        private long customerCounter = 0;

        public MM1QueueModel(double lambda, double mu, double warmupTime) {
            this.lambda = lambda;
            this.mu = mu;
            this.warmupTime = warmupTime;
        }

        @Override
        public String name() {
            return "MM1QueueModel";
        }

        @Override
        public void init(SimulationContext ctx) {
            this.serverPool = ctx.registerResourcePool("server", 1);
            this.arrivalStream = ctx.getRngStream("arrivals");
            this.serviceStream = ctx.getRngStream("service");
            this.customerCounter = 0;

            // Schedule initial arrival
            double firstArrivalDelay = arrivalStream.exponential(lambda);
            ctx.scheduleAfter(firstArrivalDelay, "ARRIVAL", null);
        }

        @Override
        public void onEvent(Event event, SimulationContext ctx) {
            switch (event.type()) {
                case "ARRIVAL" -> handleArrival(ctx);
                case "DEPARTURE" -> handleDeparture(event, ctx);
                default -> throw new IllegalArgumentException("Unknown event type: " + event.type());
            }
        }

        private void handleArrival(SimulationContext ctx) {
            double nextArrivalDelay = arrivalStream.exponential(lambda);
            ctx.scheduleAfter(nextArrivalDelay, "ARRIVAL", null);

            String customerId = "customer-" + (++customerCounter);
            Entity customer = new Entity(customerId, "CUSTOMER", ctx.now());
            double requestTime = ctx.now();

            serverPool.request(customer.getId(), 1, 0, ctx.now(), lease -> {
                double waitTime = ctx.now() - requestTime;
                if (ctx.now() >= warmupTime) {
                    ctx.metrics().getOrCreateSampleMetric("steady.customer.queue_wait").record(waitTime);
                }

                double serviceDuration = serviceStream.exponential(mu);
                DepartureRecord record = new DepartureRecord(customer, lease, requestTime);
                ctx.scheduleAfter(serviceDuration, "DEPARTURE", record);
            });
        }

        private void handleDeparture(Event event, SimulationContext ctx) {
            DepartureRecord record = (DepartureRecord) event.payload();
            double totalTimeInSystem = ctx.now() - record.customer().getCreationTime();

            if (record.customer().getCreationTime() >= warmupTime) {
                ctx.metrics().getOrCreateSampleMetric("steady.customer.system_time").record(totalTimeInSystem);
            }

            serverPool.release(record.lease(), ctx.now());
        }

        private record DepartureRecord(Entity customer, ResourceLease lease, double queueEntryTime) {
        }
    }
}
