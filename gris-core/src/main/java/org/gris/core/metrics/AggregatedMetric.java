package org.gris.core.metrics;

import java.util.List;

/**
 * Aggregated summary of a single metric across multiple Monte Carlo simulation replications.
 * Provides the grand sample mean, sample standard deviation across runs, standard error,
 * and Student-t 95% confidence interval bounds.
 */
public record AggregatedMetric(
        String name,
        int replications,
        double mean,
        double variance,
        double standardDeviation,
        double standardError,
        double confidenceInterval95Lower,
        double confidenceInterval95Upper,
        double confidenceInterval95HalfWidth,
        double min,
        double max
) {

    /**
     * Builds an AggregatedMetric from a collection of sample observations (one per replication).
     *
     * @param name   metric name
     * @param values values observed across independent replications
     * @return statistical aggregation
     */
    public static AggregatedMetric of(String name, List<Double> values) {
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException("Values list cannot be empty");
        }

        int n = values.size();
        double sum = 0.0;
        double min = Double.POSITIVE_INFINITY;
        double max = Double.NEGATIVE_INFINITY;

        for (double v : values) {
            sum += v;
            if (v < min) min = v;
            if (v > max) max = v;
        }

        double mean = sum / n;

        if (n == 1) {
            return new AggregatedMetric(name, 1, mean, 0.0, 0.0, 0.0, mean, mean, 0.0, min, max);
        }

        double varianceSum = 0.0;
        for (double v : values) {
            double diff = v - mean;
            varianceSum += diff * diff;
        }

        double variance = varianceSum / (n - 1);
        double stdDev = Math.sqrt(variance);
        double stdError = stdDev / Math.sqrt(n);

        int df = n - 1;
        double tCrit = StudentTDistribution.getCriticalValue95(df);
        double halfWidth = tCrit * stdError;

        double ciLower = mean - halfWidth;
        double ciUpper = mean + halfWidth;

        return new AggregatedMetric(
                name,
                n,
                mean,
                variance,
                stdDev,
                stdError,
                ciLower,
                ciUpper,
                halfWidth,
                min,
                max
        );
    }
}
