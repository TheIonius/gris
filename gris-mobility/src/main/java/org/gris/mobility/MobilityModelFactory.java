package org.gris.mobility;

import org.gris.core.model.ModelParameterDefinition;
import org.gris.core.model.SimulationModel;
import org.gris.core.model.SimulationModelFactory;
import org.gris.mobility.data.TlcDataLoader;
import org.gris.mobility.model.MobilityModel;
import org.gris.mobility.policy.BatchedDispatchPolicy;
import org.gris.mobility.policy.DispatchPolicy;
import org.gris.mobility.policy.NearestDispatchPolicy;
import org.gris.mobility.policy.PrepositioningDispatchPolicy;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Factory for instantiating configured NYC urban mobility dispatch models.
 */
public class MobilityModelFactory implements SimulationModelFactory {

    private final TlcDataLoader.MobilityDataset defaultDataset;

    public MobilityModelFactory() {
        this.defaultDataset = TlcDataLoader.loadDefaultDataset();
    }

    @Override
    public String modelType() {
        return "mobility-dispatch";
    }

    @Override
    public String description() {
        return "Urban vehicle dispatch across NYC TLC taxi zones with pluggable dispatch strategies (NEAREST, BATCHED, PREPOSITIONING).";
    }

    @Override
    public Map<String, ModelParameterDefinition> parameterDefinitions() {
        Map<String, ModelParameterDefinition> params = new LinkedHashMap<>();
        params.put("fleetSize", ModelParameterDefinition.of("fleetSize", "INT", "Total number of vehicles in active fleet", 400, false));
        params.put("policy", ModelParameterDefinition.of("policy", "STRING", "Dispatch strategy: 'NEAREST', 'BATCHED', or 'PREPOSITIONING'", "NEAREST", false));
        params.put("batchWindowSeconds", ModelParameterDefinition.of("batchWindowSeconds", "DOUBLE", "Batch buffer window duration in seconds (for BATCHED policy)", 20.0, false));
        params.put("demandMultiplier", ModelParameterDefinition.of("demandMultiplier", "DOUBLE", "Demand scaling multiplier (e.g. 1.0 = baseline, 1.5 = surge)", 1.0, false));
        params.put("maxWaitTolerance", ModelParameterDefinition.of("maxWaitTolerance", "DOUBLE", "Maximum seconds customer will wait before cancellation", 600.0, false));
        return params;
    }

    @Override
    public SimulationModel createModel(Map<String, Object> parameters) {
        int fleetSize = getInt(parameters, "fleetSize", 400);
        String policyName = getString(parameters, "policy", "NEAREST").toUpperCase();
        double batchWindow = getDouble(parameters, "batchWindowSeconds", 20.0);
        double demandMultiplier = getDouble(parameters, "demandMultiplier", 1.0);
        double maxWaitTolerance = getDouble(parameters, "maxWaitTolerance", 600.0);

        if (fleetSize <= 0) {
            throw new IllegalArgumentException("fleetSize must be greater than 0");
        }
        if (batchWindow <= 0) {
            throw new IllegalArgumentException("batchWindowSeconds must be greater than 0");
        }
        if (demandMultiplier <= 0) {
            throw new IllegalArgumentException("demandMultiplier must be greater than 0");
        }
        if (maxWaitTolerance <= 0) {
            throw new IllegalArgumentException("maxWaitTolerance must be greater than 0");
        }

        DispatchPolicy policy = switch (policyName) {
            case "BATCHED" -> new BatchedDispatchPolicy(batchWindow);
            case "PREPOSITIONING" -> new PrepositioningDispatchPolicy(1.5);
            default -> new NearestDispatchPolicy();
        };

        return new MobilityModel(
                defaultDataset.matrix(),
                defaultDataset.demand(),
                policy,
                fleetSize,
                demandMultiplier,
                maxWaitTolerance
        );
    }

    private int getInt(Map<String, Object> p, String k, int def) {
        if (p == null || !p.containsKey(k)) return def;
        Object v = p.get(k);
        if (v instanceof Number n) return n.intValue();
        return Integer.parseInt(v.toString());
    }

    private double getDouble(Map<String, Object> p, String k, double def) {
        if (p == null || !p.containsKey(k)) return def;
        Object v = p.get(k);
        if (v instanceof Number n) return n.doubleValue();
        return Double.parseDouble(v.toString());
    }

    private String getString(Map<String, Object> p, String k, String def) {
        if (p == null || !p.containsKey(k)) return def;
        Object v = p.get(k);
        return v != null ? v.toString() : def;
    }
}
