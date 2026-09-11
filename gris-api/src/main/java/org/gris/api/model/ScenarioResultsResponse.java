package org.gris.api.model;

import org.gris.core.engine.ReplicationReport;
import org.gris.core.engine.SimulationResult;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record ScenarioResultsResponse(
        long totalEventsProcessed,
        long wallClockMillis,
        Map<String, MetricSummaryResponse> sampleMetrics,
        Map<String, MetricSummaryResponse> timeWeightedMetrics,
        Map<String, MetricSummaryResponse> counters,
        List<EventTraceEntry> eventTrace
) {
    public ScenarioResultsResponse {
        if (eventTrace == null) {
            eventTrace = List.of();
        }
    }

    public static ScenarioResultsResponse from(ReplicationReport report) {
        return from(report, List.of());
    }

    public static ScenarioResultsResponse from(ReplicationReport report, List<EventTraceEntry> eventTrace) {
        if (report == null) return null;

        List<SimulationResult> individualRuns = report.individualRuns() != null ? report.individualRuns() : List.of();

        Map<String, MetricSummaryResponse> samples = new LinkedHashMap<>();
        report.sampleMetrics().forEach((k, v) -> {
            List<Double> repValues = new ArrayList<>();
            for (SimulationResult run : individualRuns) {
                try {
                    repValues.add(run.getSampleMean(k));
                } catch (Exception ignored) {}
            }
            samples.put(k, MetricSummaryResponse.from(v, repValues));
        });

        Map<String, MetricSummaryResponse> timeWeighted = new LinkedHashMap<>();
        report.timeWeightedMetrics().forEach((k, v) -> {
            List<Double> repValues = new ArrayList<>();
            for (SimulationResult run : individualRuns) {
                try {
                    repValues.add(run.getTimeAverage(k));
                } catch (Exception ignored) {}
            }
            timeWeighted.put(k, MetricSummaryResponse.from(v, repValues));
        });

        Map<String, MetricSummaryResponse> counters = new LinkedHashMap<>();
        report.counters().forEach((k, v) -> {
            List<Double> repValues = new ArrayList<>();
            for (SimulationResult run : individualRuns) {
                try {
                    repValues.add((double) run.getCounter(k));
                } catch (Exception ignored) {}
            }
            counters.put(k, MetricSummaryResponse.from(v, repValues));
        });

        return new ScenarioResultsResponse(
                report.totalEventsProcessed(),
                report.wallClockMillis(),
                samples,
                timeWeighted,
                counters,
                eventTrace != null ? eventTrace : List.of()
        );
    }
}
