package org.gris.core.engine;

import org.gris.core.metrics.AggregatedMetric;
import org.gris.core.model.SimulationModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;

/**
 * Executes multiple independent Monte Carlo simulation replications in parallel.
 * Each replication receives an independent, reproducible seed (baseSeed + r * 7919L),
 * and results are aggregated into grand means with Student-t 95% confidence intervals.
 */
public class ReplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(ReplicationRunner.class);
    private static final long SEED_STRIDE = 7919L;

    private final ExecutorService executor;
    private final boolean ownsExecutor;

    public ReplicationRunner() {
        this(ForkJoinPool.commonPool(), false);
    }

    public ReplicationRunner(ExecutorService executor) {
        this(executor, false);
    }

    public ReplicationRunner(int threadPoolSize) {
        this(Executors.newFixedThreadPool(threadPoolSize), true);
    }

    private ReplicationRunner(ExecutorService executor, boolean ownsExecutor) {
        this.executor = Objects.requireNonNull(executor, "ExecutorService cannot be null");
        this.ownsExecutor = ownsExecutor;
    }

    /**
     * Runs N Monte Carlo replications for the supplied model to the specified horizon.
     *
     * @param modelSupplier factory generating a fresh SimulationModel instance per replication
     * @param horizon       virtual simulation time horizon
     * @param replications  number of independent replications (N >= 1)
     * @param baseSeed      master base seed for the sequence
     * @return statistical aggregation report with 95% confidence intervals
     */
    public ReplicationReport runReplications(
            Supplier<SimulationModel> modelSupplier,
            double horizon,
            int replications,
            long baseSeed
    ) {
        Objects.requireNonNull(modelSupplier, "Model supplier cannot be null");
        if (horizon <= 0) {
            throw new IllegalArgumentException("Horizon must be positive, got: " + horizon);
        }
        if (replications < 1) {
            throw new IllegalArgumentException("Replications must be >= 1, got: " + replications);
        }

        long startWallTime = System.currentTimeMillis();
        log.info("Starting {} parallel replications (horizon={}, baseSeed={})",
                replications, horizon, baseSeed);

        List<CompletableFuture<SimulationResult>> futures = new ArrayList<>(replications);

        for (int r = 0; r < replications; r++) {
            final int repIndex = r;
            final long repSeed = baseSeed + repIndex * SEED_STRIDE;

            CompletableFuture<SimulationResult> future = CompletableFuture.supplyAsync(() -> {
                SimulationModel model = modelSupplier.get();
                SimulationEngine engine = new SimulationEngine(repSeed);
                return engine.run(model, horizon);
            }, executor);

            futures.add(future);
        }

        // Wait for all replications to complete
        List<SimulationResult> results = new ArrayList<>(replications);
        for (int r = 0; r < replications; r++) {
            try {
                results.add(futures.get(r).get());
            } catch (InterruptedException e) {
                for (CompletableFuture<SimulationResult> f : futures) {
                    f.cancel(true);
                }
                Thread.currentThread().interrupt();
                throw new RuntimeException("Replication runner interrupted at replication " + r, e);
            } catch (ExecutionException e) {
                for (CompletableFuture<SimulationResult> f : futures) {
                    f.cancel(true);
                }
                throw new RuntimeException("Replication execution failed at replication " + r + ": " + e.getCause().getMessage(), e.getCause());
            }
        }

        long wallClockMillis = System.currentTimeMillis() - startWallTime;
        return aggregateResults(results, horizon, baseSeed, wallClockMillis);
    }

    private ReplicationReport aggregateResults(
            List<SimulationResult> results,
            double horizon,
            long baseSeed,
            long wallClockMillis
    ) {
        int n = results.size();
        String modelName = results.getFirst().modelName();
        long totalEvents = 0;

        // Collect all metric names
        Set<String> sampleMetricNames = new LinkedHashSet<>();
        Set<String> timeWeightedNames = new LinkedHashSet<>();
        Set<String> counterNames = new LinkedHashSet<>();

        for (SimulationResult res : results) {
            totalEvents += res.eventsProcessed();
            sampleMetricNames.addAll(res.getAllSampleMetrics().keySet());
            timeWeightedNames.addAll(res.getAllTimeWeightedMetrics().keySet());
            counterNames.addAll(res.metrics().getCounters().keySet());
        }

        // Aggregate sample metrics
        Map<String, AggregatedMetric> aggregatedSampleMetrics = new LinkedHashMap<>();
        for (String metricName : sampleMetricNames) {
            List<Double> values = new ArrayList<>(n);
            for (SimulationResult res : results) {
                var m = res.metrics().getSampleMetric(metricName);
                if (m != null && m.getCount() > 0) {
                    values.add(m.getMean());
                }
            }
            if (!values.isEmpty()) {
                aggregatedSampleMetrics.put(metricName, AggregatedMetric.of(metricName, values));
            }
        }

        // Aggregate time-weighted metrics
        Map<String, AggregatedMetric> aggregatedTimeWeighted = new LinkedHashMap<>();
        for (String metricName : timeWeightedNames) {
            List<Double> values = new ArrayList<>(n);
            for (SimulationResult res : results) {
                var m = res.metrics().getTimeWeightedMetric(metricName);
                if (m != null) {
                    values.add(m.getAverage(res.simulatedTime()));
                }
            }
            if (!values.isEmpty()) {
                aggregatedTimeWeighted.put(metricName, AggregatedMetric.of(metricName, values));
            }
        }

        // Aggregate counters
        Map<String, AggregatedMetric> aggregatedCounters = new LinkedHashMap<>();
        for (String counterName : counterNames) {
            List<Double> values = new ArrayList<>(n);
            for (SimulationResult res : results) {
                values.add((double) res.getCounter(counterName));
            }
            aggregatedCounters.put(counterName, AggregatedMetric.of(counterName, values));
        }

        log.info("Aggregated {} replications in {} ms. Total events={}", n, wallClockMillis, totalEvents);

        return new ReplicationReport(
                modelName,
                n,
                horizon,
                baseSeed,
                totalEvents,
                wallClockMillis,
                aggregatedSampleMetrics,
                aggregatedTimeWeighted,
                aggregatedCounters,
                results
        );
    }

    public void shutdown() {
        if (ownsExecutor) {
            executor.shutdown();
        }
    }
}
