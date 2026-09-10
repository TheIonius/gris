package org.gris.core.engine;

import org.gris.core.model.Event;
import org.gris.core.model.SimulationContext;
import org.gris.core.model.SimulationModel;
import org.gris.core.random.RngManager;
import org.gris.core.random.RngStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DeterministicExecutionTest {

    @Test
    @DisplayName("Identical seeds must produce bitwise identical event traces and metrics")
    void testDeterministicSimulationRuns() {
        long seed = 42L;
        double horizon = 500.0;

        SimpleStochasticModel model1 = new SimpleStochasticModel();
        SimulationEngine engine1 = new SimulationEngine(seed);
        SimulationResult result1 = engine1.run(model1, horizon);

        SimpleStochasticModel model2 = new SimpleStochasticModel();
        SimulationEngine engine2 = new SimulationEngine(seed);
        SimulationResult result2 = engine2.run(model2, horizon);

        assertThat(result1.eventsProcessed()).isEqualTo(result2.eventsProcessed());
        assertThat(result1.eventsScheduled()).isEqualTo(result2.eventsScheduled());
        assertThat(result1.simulatedTime()).isEqualTo(result2.simulatedTime());
        assertThat(model1.eventTrace).containsExactlyElementsOf(model2.eventTrace);

        assertThat(result1.getSampleMean("processing_time"))
                .isEqualTo(result2.getSampleMean("processing_time"));
    }

    @Test
    @DisplayName("Isolated RNG streams guarantee that altering process B does not perturb stream A")
    void testRngStreamIsolation() {
        long masterSeed = 12345L;

        // Run 1: Draw from arrivals only
        RngManager mgr1 = new RngManager(masterSeed);
        RngStream arrivals1 = mgr1.getStream("arrivals");
        List<Double> arrivalSamples1 = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            arrivalSamples1.add(arrivals1.exponential(1.5));
        }

        // Run 2: Draw interleaved amounts from a different stream "fleet", then draw from "arrivals"
        RngManager mgr2 = new RngManager(masterSeed);
        RngStream fleet2 = mgr2.getStream("fleet");
        for (int i = 0; i < 500; i++) {
            fleet2.nextDouble();
        }
        RngStream arrivals2 = mgr2.getStream("arrivals");
        List<Double> arrivalSamples2 = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            arrivalSamples2.add(arrivals2.exponential(1.5));
        }

        // The arrival sequences must match exactly despite massive activity on fleet2
        assertThat(arrivalSamples1).containsExactlyElementsOf(arrivalSamples2);
    }

    private static class SimpleStochasticModel implements SimulationModel {
        final List<String> eventTrace = new ArrayList<>();

        @Override
        public String name() {
            return "SimpleStochasticModel";
        }

        @Override
        public void init(SimulationContext ctx) {
            ctx.scheduleAfter(0.0, "SPAWN", 0);
        }

        @Override
        public void onEvent(Event event, SimulationContext ctx) {
            eventTrace.add(String.format("t=%.4f:%s:%s", event.time(), event.type(), event.payload()));

            if ("SPAWN".equals(event.type())) {
                RngStream rng = ctx.getRngStream("spawner");
                int count = (int) event.payload();
                if (count < 20) {
                    double delay = rng.exponential(0.5);
                    ctx.scheduleAfter(delay, "SPAWN", count + 1);

                    double procTime = rng.uniform(1.0, 5.0);
                    ctx.metrics().getOrCreateSampleMetric("processing_time").record(procTime);
                }
            }
        }
    }
}
