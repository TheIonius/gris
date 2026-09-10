package org.gris.core.metrics;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Registry holding simulation statistics and metrics.
 */
public class MetricsRegistry {
    private final Map<String, SampleMetric> sampleMetrics = new ConcurrentHashMap<>();
    private final Map<String, TimeWeightedMetric> timeWeightedMetrics = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> counters = new ConcurrentHashMap<>();

    public SampleMetric getOrCreateSampleMetric(String name) {
        return sampleMetrics.computeIfAbsent(name, SampleMetric::new);
    }

    public TimeWeightedMetric getOrCreateTimeWeightedMetric(String name, double initialTime, double initialValue) {
        return timeWeightedMetrics.computeIfAbsent(name, n -> new TimeWeightedMetric(n, initialTime, initialValue));
    }

    public void incrementCounter(String name) {
        incrementCounter(name, 1L);
    }

    public void incrementCounter(String name, long delta) {
        counters.computeIfAbsent(name, n -> new AtomicLong(0)).addAndGet(delta);
    }

    public long getCounter(String name) {
        AtomicLong counter = counters.get(name);
        return counter == null ? 0L : counter.get();
    }

    public SampleMetric getSampleMetric(String name) {
        return sampleMetrics.get(name);
    }

    public TimeWeightedMetric getTimeWeightedMetric(String name) {
        return timeWeightedMetrics.get(name);
    }

    public Map<String, SampleMetric> getSampleMetrics() {
        return Collections.unmodifiableMap(sampleMetrics);
    }

    public Map<String, TimeWeightedMetric> getTimeWeightedMetrics() {
        return Collections.unmodifiableMap(timeWeightedMetrics);
    }

    public Map<String, Long> getCounters() {
        Map<String, Long> result = new ConcurrentHashMap<>();
        counters.forEach((k, v) -> result.put(k, v.get()));
        return Collections.unmodifiableMap(result);
    }

    /**
     * Finalizes all time-weighted metrics to the horizon timestamp.
     */
    public void finalizeToTime(double horizon) {
        timeWeightedMetrics.values().forEach(m -> m.advanceTo(horizon));
    }

    public void reset(double initialTime) {
        sampleMetrics.values().forEach(SampleMetric::reset);
        timeWeightedMetrics.values().forEach(m -> m.reset(initialTime, 0.0));
        counters.values().forEach(c -> c.set(0));
    }
}
