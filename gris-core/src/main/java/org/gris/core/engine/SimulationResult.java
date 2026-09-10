package org.gris.core.engine;

import org.gris.core.metrics.MetricsRegistry;
import org.gris.core.metrics.SampleMetric;
import org.gris.core.metrics.TimeWeightedMetric;

import java.util.Map;

/**
 * Encapsulates the execution summary and collected statistics of a simulation run.
 */
public record SimulationResult(
        String modelName,
        long masterSeed,
        double horizon,
        double simulatedTime,
        long eventsProcessed,
        long eventsScheduled,
        long wallClockMillis,
        MetricsRegistry metrics
) {

    public double getSampleMean(String metricName) {
        SampleMetric metric = metrics.getSampleMetric(metricName);
        if (metric == null) {
            throw new IllegalArgumentException("Sample metric not found: " + metricName);
        }
        return metric.getMean();
    }

    public double getSampleConfidenceInterval95(String metricName) {
        SampleMetric metric = metrics.getSampleMetric(metricName);
        if (metric == null) {
            throw new IllegalArgumentException("Sample metric not found: " + metricName);
        }
        return metric.getConfidenceInterval95();
    }

    public double getTimeAverage(String metricName) {
        TimeWeightedMetric metric = metrics.getTimeWeightedMetric(metricName);
        if (metric == null) {
            throw new IllegalArgumentException("Time-weighted metric not found: " + metricName);
        }
        return metric.getAverage(simulatedTime);
    }

    public long getCounter(String name) {
        return metrics.getCounter(name);
    }

    public Map<String, SampleMetric> getAllSampleMetrics() {
        return metrics.getSampleMetrics();
    }

    public Map<String, TimeWeightedMetric> getAllTimeWeightedMetrics() {
        return metrics.getTimeWeightedMetrics();
    }
}
