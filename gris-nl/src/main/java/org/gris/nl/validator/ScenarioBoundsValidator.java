package org.gris.nl.validator;

import org.gris.core.model.ModelParameterDefinition;
import org.gris.core.model.ModelRegistry;
import org.gris.core.model.SimulationModelFactory;
import org.gris.nl.model.ValidationReport;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Schema and bounds validator: validates parameter ranges, model availability,
 * and domain physical/mathematical safety rules before any simulation execution.
 */
public class ScenarioBoundsValidator {

    public ValidationReport validate(
            String modelType,
            double horizon,
            int replications,
            Map<String, Object> parameters,
            ModelRegistry registry
    ) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // 1. Model Registry Check
        if (modelType == null || modelType.isBlank()) {
            errors.add("Model type cannot be blank");
            return ValidationReport.failure(errors, warnings);
        }

        Optional<SimulationModelFactory> factoryOpt = registry.getFactory(modelType);
        if (factoryOpt.isEmpty()) {
            errors.add(String.format("Unknown model type '%s'. Available models: %s",
                    modelType, registry.getAvailableModelTypes()));
            return ValidationReport.failure(errors, warnings);
        }

        SimulationModelFactory factory = factoryOpt.get();

        // 2. Horizon Check
        if (horizon <= 0) {
            errors.add(String.format("Simulation horizon must be positive, got: %.2f", horizon));
        } else if (horizon > 31_536_000.0) { // > 1 year
            warnings.add("Horizon exceeds 1 calendar year (31,536,000s); execution may take significant wall-clock time.");
        }

        // 3. Replications Check
        if (replications < 1) {
            errors.add(String.format("Replications must be at least 1, got: %d", replications));
        } else if (replications > 200) {
            errors.add(String.format("Replications limit is 200 to prevent denial of service, got: %d", replications));
        } else if (replications > 50) {
            warnings.add(String.format("High replication count (%d) requested; parallel runner may saturate CPU.", replications));
        }

        // 4. Model Parameter Definitions Check
        Map<String, ModelParameterDefinition> defs = factory.parameterDefinitions();
        for (var entry : defs.entrySet()) {
            String paramName = entry.getKey();
            ModelParameterDefinition def = entry.getValue();

            if (def.required() && (parameters == null || !parameters.containsKey(paramName))) {
                errors.add(String.format("Missing required parameter '%s' for model '%s'", paramName, modelType));
            }
        }

        // 5. Domain-Specific Mathematical and Physical Boundary Rules
        if ("mm1-queue".equals(modelType)) {
            validateMM1(parameters, errors, warnings);
        } else if ("mobility-dispatch".equals(modelType)) {
            validateMobility(parameters, errors, warnings);
        } else if ("caucedo-terminal".equals(modelType)) {
            validateTerminal(parameters, errors, warnings);
        }

        if (!errors.isEmpty()) {
            return ValidationReport.failure(errors, warnings);
        }
        return ValidationReport.success(warnings);
    }

    private void validateMM1(Map<String, Object> p, List<String> errors, List<String> warnings) {
        if (p == null) return;
        double lambda = getDouble(p, "lambda", 0.5);
        double mu = getDouble(p, "mu", 1.0);
        int servers = getInt(p, "servers", 1);
        double warmup = getDouble(p, "warmup", 2000.0);

        if (lambda <= 0) errors.add(String.format("Arrival rate lambda must be strictly positive, got: %.4f", lambda));
        if (mu <= 0) errors.add(String.format("Service rate mu must be strictly positive, got: %.4f", mu));
        if (servers < 1) errors.add(String.format("Servers must be at least 1, got: %d", servers));
        if (warmup < 0) errors.add(String.format("Warmup cannot be negative, got: %.2f", warmup));

        if (lambda > 0 && mu > 0 && servers >= 1) {
            double rho = lambda / (mu * servers);
            if (rho >= 1.0) {
                warnings.add(String.format(
                        "Unstable queue: Traffic intensity rho = %.2f >= 1.0 (lambda=%.2f, mu=%.2f, c=%d). " +
                                "Queue length and delay will grow without bound.", rho, lambda, mu, servers));
            } else if (rho > 0.95) {
                warnings.add(String.format("Heavy traffic: rho = %.2f is very close to 1.0; high variance expected.", rho));
            }
        }
    }

    private void validateMobility(Map<String, Object> p, List<String> errors, List<String> warnings) {
        if (p == null) return;
        int fleetSize = getInt(p, "fleetSize", 400);
        double demandMultiplier = getDouble(p, "demandMultiplier", 1.0);
        double batchWindow = getDouble(p, "batchWindowSeconds", 20.0);
        double maxWait = getDouble(p, "maxWaitTolerance", 600.0);
        String policy = getString(p, "policy", "NEAREST").toUpperCase();

        if (fleetSize < 1) errors.add("Fleet size must be at least 1 vehicle");
        if (fleetSize > 5000) warnings.add("Fleet size > 5,000 may incur heavy simulation memory overhead.");
        if (demandMultiplier <= 0) errors.add("Demand multiplier must be strictly positive");
        if (demandMultiplier > 10.0) warnings.add("Extreme demand multiplier (>10x baseline) may cause near-total passenger cancellations.");
        if (batchWindow <= 0) errors.add("Batch window seconds must be positive");
        if (maxWait <= 0) errors.add("Max wait tolerance must be positive");

        if (!List.of("NEAREST", "BATCHED", "PREPOSITIONING").contains(policy)) {
            errors.add(String.format("Unknown dispatch policy '%s'. Valid policies: NEAREST, BATCHED, PREPOSITIONING", policy));
        }
    }

    private void validateTerminal(Map<String, Object> p, List<String> errors, List<String> warnings) {
        if (p == null) return;
        int berths = getInt(p, "berths", 3);
        int quayCranes = getInt(p, "quayCranes", 8);
        double movesPerHour = getDouble(p, "movesPerHourPerCrane", 28.0);
        double arrivalRate = getDouble(p, "arrivalRatePerDay", 4.0);
        String cranePolicy = getString(p, "cranePolicy", "DYNAMIC").toUpperCase();

        if (berths < 1) errors.add("Berths must be at least 1");
        if (berths > 12) warnings.add("Berths > 12 exceeds DP World Caucedo physical port layout.");
        if (quayCranes < 1) errors.add("Quay cranes must be at least 1");
        if (movesPerHour <= 0) errors.add("Moves per hour per crane (GMPH) must be positive");
        if (arrivalRate <= 0) errors.add("Arrival rate per day must be positive");

        if (!List.of("STATIC", "DYNAMIC").contains(cranePolicy)) {
            errors.add(String.format("Unknown crane policy '%s'. Valid policies: STATIC, DYNAMIC", cranePolicy));
        }
    }

    private double getDouble(Map<String, Object> p, String k, double def) {
        if (p == null || !p.containsKey(k)) return def;
        Object v = p.get(k);
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return def; }
    }

    private int getInt(Map<String, Object> p, String k, int def) {
        if (p == null || !p.containsKey(k)) return def;
        Object v = p.get(k);
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return def; }
    }

    private String getString(Map<String, Object> p, String k, String def) {
        if (p == null || !p.containsKey(k)) return def;
        Object v = p.get(k);
        return v != null ? v.toString() : def;
    }
}
