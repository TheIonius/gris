package org.gris.nl.eval;

import org.gris.core.model.ModelRegistry;
import org.gris.nl.model.NlParseResult;
import org.gris.nl.parser.ScenarioPromptParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Evaluation harness: test set with 30 natural language phrasings and ground-truth configs
 * to rigorously score prompt extraction accuracy.
 */
public class NlEvaluationHarness {

    private static final Logger log = LoggerFactory.getLogger(NlEvaluationHarness.class);

    public record CaseReport(
            String id,
            String prompt,
            boolean modelMatched,
            boolean paramsMatched,
            boolean warningsMatched,
            boolean passed,
            String failureReason
    ) {}

    public record BenchmarkSummary(
            int totalCases,
            int passedCases,
            double accuracy,
            List<CaseReport> reports
    ) {}

    private final List<EvaluationCase> benchmarkCases = new ArrayList<>();

    public NlEvaluationHarness() {
        populateBenchmarkCases();
    }

    public BenchmarkSummary evaluate(ScenarioPromptParser parser, ModelRegistry registry) {
        List<CaseReport> reports = new ArrayList<>();
        int passedCount = 0;

        for (EvaluationCase tc : benchmarkCases) {
            NlParseResult result = parser.parse(tc.prompt(), registry);

            boolean modelOk = tc.expectedModel().equalsIgnoreCase(result.modelType());
            boolean paramsOk = true;
            String failureMsg = "";

            // Check expected parameters
            for (var expEntry : tc.expectedParams().entrySet()) {
                String key = expEntry.getKey();
                Object expVal = expEntry.getValue();
                Object actualVal = result.parameters().get(key);

                if (actualVal == null) {
                    paramsOk = false;
                    failureMsg = "Missing parameter: " + key;
                    break;
                }

                if (expVal instanceof Number expNum && actualVal instanceof Number actNum) {
                    if (Math.abs(expNum.doubleValue() - actNum.doubleValue()) > 1e-3) {
                        paramsOk = false;
                        failureMsg = String.format("Param '%s' mismatch: expected %s, got %s", key, expVal, actualVal);
                        break;
                    }
                } else if (!expVal.toString().equalsIgnoreCase(actualVal.toString())) {
                    paramsOk = false;
                    failureMsg = String.format("Param '%s' mismatch: expected %s, got %s", key, expVal, actualVal);
                    break;
                }
            }

            // Check warning substring if required
            boolean warningOk = true;
            if (tc.expectedWarningSubstring() != null) {
                warningOk = result.warnings().stream().anyMatch(w -> w.toLowerCase().contains(tc.expectedWarningSubstring().toLowerCase()));
                if (!warningOk) {
                    failureMsg = "Missing expected warning containing: " + tc.expectedWarningSubstring();
                }
            }

            boolean passed = modelOk && paramsOk && warningOk;
            if (passed) passedCount++;

            reports.add(new CaseReport(tc.id(), tc.prompt(), modelOk, paramsOk, warningOk, passed, failureMsg));
        }

        double accuracy = (double) passedCount / benchmarkCases.size() * 100.0;
        return new BenchmarkSummary(benchmarkCases.size(), passedCount, accuracy, reports);
    }

    private void populateBenchmarkCases() {
        // --- NYC TLC Mobility Cases ---
        benchmarkCases.add(new EvaluationCase(
                "MOB-01",
                "what if we lose 20% of vehicles in Brooklyn on Friday evening?",
                "mobility-dispatch",
                Map.of("fleetSize", 320, "demandMultiplier", 1.3),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-02",
                "Simulate 300 taxis with batched dispatch and batch window of 15s for 2 hours",
                "mobility-dispatch",
                Map.of("fleetSize", 300, "policy", "BATCHED", "batchWindowSeconds", 15.0),
                7200.0, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-03",
                "Evaluate prepositioning policy with 500 vehicles during a surge of 50%",
                "mobility-dispatch",
                Map.of("fleetSize", 500, "policy", "PREPOSITIONING", "demandMultiplier", 1.5),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-04",
                "Compare greedy nearest dispatch with 200 vehicles and cancellation after 5 minutes",
                "mobility-dispatch",
                Map.of("fleetSize", 200, "policy", "NEAREST", "maxWaitTolerance", 300.0),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-05",
                "What happens if demand triples during rush hour with 400 cabs?",
                "mobility-dispatch",
                Map.of("fleetSize", 400, "demandMultiplier", 3.0),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-06",
                "Cut fleet in half for 3600 seconds with 20 replications",
                "mobility-dispatch",
                Map.of("fleetSize", 200),
                3600.0, 20, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-07",
                "Test batched dispatch with batch window 30s across Manhattan",
                "mobility-dispatch",
                Map.of("policy", "BATCHED", "batchWindowSeconds", 30.0),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-08",
                "Simulate 400 taxis with prepositioning dispatch for 4 hours",
                "mobility-dispatch",
                Map.of("fleetSize", 400, "policy", "PREPOSITIONING"),
                14400.0, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-09",
                "What if vehicle fleet drops 10% and demand up 25%?",
                "mobility-dispatch",
                Map.of("fleetSize", 360, "demandMultiplier", 1.25),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-10",
                "Run 15 trials of 250 vehicles with nearest dispatch",
                "mobility-dispatch",
                Map.of("fleetSize", 250, "policy", "NEAREST"),
                null, 15, null
        ));

        // --- DP World Caucedo Terminal Cases ---
        benchmarkCases.add(new EvaluationCase(
                "TERM-01",
                "what if two cranes go down at Caucedo terminal?",
                "caucedo-terminal",
                Map.of("quayCranes", 6),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-02",
                "Simulate 3 berths and 8 quay cranes with dynamic allocation for 7 days",
                "caucedo-terminal",
                Map.of("berths", 3, "quayCranes", 8, "cranePolicy", "DYNAMIC"),
                604800.0, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-03",
                "What if berth 3 closed and we have 6 quay cranes?",
                "caucedo-terminal",
                Map.of("berths", 2, "quayCranes", 6),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-04",
                "Test static crane policy with 8 quay cranes and 4 vessels per day",
                "caucedo-terminal",
                Map.of("cranePolicy", "STATIC", "quayCranes", 8, "arrivalRatePerDay", 4.0),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-05",
                "What if vessel arrivals double for 14 days?",
                "caucedo-terminal",
                Map.of("arrivalRatePerDay", 8.0),
                1209600.0, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-06",
                "Simulate Caucedo with 4 berths, 10 cranes, and dynamic crane allocation",
                "caucedo-terminal",
                Map.of("berths", 4, "quayCranes", 10, "cranePolicy", "DYNAMIC"),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-07",
                "Crane speed drops to 22 moves per hour with 7 quay cranes for 5 days",
                "caucedo-terminal",
                Map.of("movesPerHourPerCrane", 22.0, "quayCranes", 7),
                432000.0, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-08",
                "Evaluate half the cranes offline under dynamic crane policy",
                "caucedo-terminal",
                Map.of("quayCranes", 4, "cranePolicy", "DYNAMIC"),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-09",
                "Run 20 replications of 6 vessels per day at DP World Caucedo",
                "caucedo-terminal",
                Map.of("arrivalRatePerDay", 6.0),
                null, 20, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-10",
                "Caucedo terminal with static allocation and one crane goes down",
                "caucedo-terminal",
                Map.of("cranePolicy", "STATIC", "quayCranes", 7),
                null, null, null
        ));

        // --- Analytical M/M/1 Queue Cases ---
        benchmarkCases.add(new EvaluationCase(
                "MM1-01",
                "Simulate an M/M/1 queue with arrival rate 0.8 and service rate 1.0 for 10000s",
                "mm1-queue",
                Map.of("lambda", 0.8, "mu", 1.0, "servers", 1),
                10000.0, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MM1-02",
                "M/M/1 queue with lambda=0.5 and mu=1.0 with 25 replications",
                "mm1-queue",
                Map.of("lambda", 0.5, "mu", 1.0),
                null, 25, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MM1-03",
                "Dual server queue c=2 with arrival rate 1.4 and service rate 1.0",
                "mm1-queue",
                Map.of("servers", 2, "lambda", 1.4, "mu", 1.0),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MM1-04",
                "Simulate a single server queue with lambda of 0.3, service rate of 0.6, warmup of 500",
                "mm1-queue",
                Map.of("lambda", 0.3, "mu", 0.6, "warmup", 500.0, "servers", 1),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MM1-05",
                "Multi-server queue with 3 servers, arrival rate 2.1, and service rate 1.0",
                "mm1-queue",
                Map.of("servers", 3, "lambda", 2.1, "mu", 1.0),
                null, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "MM1-06",
                "Queueing model with arrival rate 0.9 and service rate 1.0 for 20000 seconds",
                "mm1-queue",
                Map.of("lambda", 0.9, "mu", 1.0),
                20000.0, null, null
        ));

        // --- Edge Cases / Safety Warnings ---
        benchmarkCases.add(new EvaluationCase(
                "SAFE-01",
                "Simulate an unstable queue with lambda 1.5 and mu 1.0",
                "mm1-queue",
                Map.of("lambda", 1.5, "mu", 1.0),
                null, null, "unstable"
        ));
        benchmarkCases.add(new EvaluationCase(
                "MOB-11",
                "Run taxi dispatch with 2x demand for 1 hour",
                "mobility-dispatch",
                Map.of("demandMultiplier", 2.0),
                3600.0, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-11",
                "Caucedo port simulation with 3 berths for 10 days",
                "caucedo-terminal",
                Map.of("berths", 3),
                864000.0, null, null
        ));
        benchmarkCases.add(new EvaluationCase(
                "TERM-12",
                "What if 3 cranes go down and 5 vessels per day at Caucedo?",
                "caucedo-terminal",
                Map.of("quayCranes", 5, "arrivalRatePerDay", 5.0),
                null, null, null
        ));
    }

    public List<EvaluationCase> getBenchmarkCases() {
        return List.copyOf(benchmarkCases);
    }
}
