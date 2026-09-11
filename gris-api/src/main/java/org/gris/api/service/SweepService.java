package org.gris.api.service;

import org.gris.api.model.SweepPointResult;
import org.gris.api.model.SweepRequest;
import org.gris.api.model.SweepResponse;
import org.gris.core.engine.ReplicationReport;
import org.gris.core.engine.ReplicationRunner;
import org.gris.core.engine.SimulationResult;
import org.gris.core.metrics.AggregatedMetric;
import org.gris.core.model.ModelRegistry;
import org.gris.core.model.SimulationModelFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SweepService {
    private static final Logger log = LoggerFactory.getLogger(SweepService.class);

    private final ModelRegistry modelRegistry;
    private final ReplicationRunner replicationRunner;

    public SweepService(ModelRegistry modelRegistry, ReplicationRunner replicationRunner) {
        this.modelRegistry = modelRegistry;
        this.replicationRunner = replicationRunner;
    }

    public SweepResponse runSweep(SweepRequest request) {
        long startTotal = System.currentTimeMillis();
        String sweepId = UUID.randomUUID().toString();

        SimulationModelFactory factory = modelRegistry.getRequiredFactory(request.modelType());

        List<SweepPointResult> points = new ArrayList<>();
        Map<String, Object> baseParams = request.baseParameters() != null
                ? new HashMap<>(request.baseParameters())
                : new HashMap<>();

        log.info("Starting sensitivity sweep '{}' across {} points for {}.{}",
                request.name(), request.parameterValues().size(), request.modelType(), request.parameterName());

        for (Double paramVal : request.parameterValues()) {
            long pointStart = System.currentTimeMillis();
            Map<String, Object> pointParams = new HashMap<>(baseParams);
            pointParams.put(request.parameterName(), paramVal);

            ReplicationReport report = replicationRunner.runReplications(
                    () -> factory.createModel(pointParams),
                    request.horizon(),
                    request.replications(),
                    request.seedBase()
            );

            long pointWall = System.currentTimeMillis() - pointStart;

            AggregatedMetric metric = findMetric(report, request.targetMetric());
            if (metric == null) {
                metric = report.sampleMetrics().values().stream().findFirst().orElse(null);
            }

            if (metric != null) {
                List<Double> repVals = new ArrayList<>();
                if (report.individualRuns() != null) {
                    for (SimulationResult run : report.individualRuns()) {
                        try {
                            if (report.sampleMetrics().containsKey(metric.name())) {
                                repVals.add(run.getSampleMean(metric.name()));
                            } else if (report.timeWeightedMetrics().containsKey(metric.name())) {
                                repVals.add(run.getTimeAverage(metric.name()));
                            } else if (report.counters().containsKey(metric.name())) {
                                repVals.add((double) run.getCounter(metric.name()));
                            }
                        } catch (Exception ignored) {}
                    }
                }

                points.add(new SweepPointResult(
                        paramVal,
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
                        repVals,
                        report.totalEventsProcessed(),
                        pointWall
                ));
            }
        }

        long totalWall = System.currentTimeMillis() - startTotal;
        log.info("Completed sensitivity sweep '{}' in {} ms", request.name(), totalWall);

        return new SweepResponse(
                sweepId,
                request.name(),
                request.modelType(),
                request.parameterName(),
                request.targetMetric(),
                baseParams,
                request.horizon(),
                request.replications(),
                points,
                totalWall
        );
    }

    private AggregatedMetric findMetric(ReplicationReport report, String metricName) {
        if (report.sampleMetrics().containsKey(metricName)) {
            return report.sampleMetrics().get(metricName);
        }
        if (report.timeWeightedMetrics().containsKey(metricName)) {
            return report.timeWeightedMetrics().get(metricName);
        }
        if (report.counters().containsKey(metricName)) {
            return report.counters().get(metricName);
        }
        return null;
    }
}
