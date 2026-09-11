package org.gris.api.model;

import org.gris.core.metrics.AggregatedMetric;

import java.util.List;

public record MetricSummaryResponse(
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
        double max,
        List<Double> replicationValues
) {
    public MetricSummaryResponse {
        if (replicationValues == null) {
            replicationValues = List.of();
        }
    }

    public static MetricSummaryResponse from(AggregatedMetric metric) {
        return from(metric, List.of());
    }

    public static MetricSummaryResponse from(AggregatedMetric metric, List<Double> replicationValues) {
        if (metric == null) return null;
        return new MetricSummaryResponse(
                metric.name(),
                metric.replications(),
                metric.mean(),
                metric.variance(),
                metric.standardDeviation(),
                metric.standardError(),
                metric.confidenceInterval95Lower(),
                metric.confidenceInterval95Upper(),
                metric.confidenceInterval95HalfWidth(),
                metric.min(),
                metric.max(),
                replicationValues != null ? replicationValues : List.of()
        );
    }
}
