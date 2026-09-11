package org.gris.terminal;

import org.gris.core.model.ModelParameterDefinition;
import org.gris.core.model.SimulationModel;
import org.gris.core.model.SimulationModelFactory;
import org.gris.terminal.model.CaucedoTerminalModel;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Factory for creating configured DP World Caucedo container terminal simulation models.
 */
public class TerminalModelFactory implements SimulationModelFactory {

    @Override
    public String modelType() {
        return "caucedo-terminal";
    }

    @Override
    public String description() {
        return "Container terminal logistics model for DP World Caucedo simulating vessel traffic, berth scheduling, and quay crane allocation.";
    }

    @Override
    public Map<String, ModelParameterDefinition> parameterDefinitions() {
        Map<String, ModelParameterDefinition> params = new LinkedHashMap<>();
        params.put("berths", ModelParameterDefinition.of("berths", "INT", "Number of operational container berths", 3, false));
        params.put("quayCranes", ModelParameterDefinition.of("quayCranes", "INT", "Total number of available quay cranes (STS)", 8, false));
        params.put("movesPerHourPerCrane", ModelParameterDefinition.of("movesPerHourPerCrane", "DOUBLE", "Gross container moves per hour per crane (GMPH)", 28.0, false));
        params.put("cranePolicy", ModelParameterDefinition.of("cranePolicy", "STRING", "Crane allocation policy: 'STATIC' (2 per vessel) or 'DYNAMIC' (2-4 size-dependent)", "DYNAMIC", false));
        params.put("arrivalRatePerDay", ModelParameterDefinition.of("arrivalRatePerDay", "DOUBLE", "Mean vessel arrivals per 24-hour day", 4.0, false));
        return params;
    }

    @Override
    public SimulationModel createModel(Map<String, Object> parameters) {
        int berths = getInt(parameters, "berths", 3);
        int quayCranes = getInt(parameters, "quayCranes", 8);
        double movesPerHourPerCrane = getDouble(parameters, "movesPerHourPerCrane", 28.0);
        String cranePolicy = getString(parameters, "cranePolicy", "DYNAMIC").toUpperCase();
        double arrivalRatePerDay = getDouble(parameters, "arrivalRatePerDay", 4.0);

        if (berths <= 0) {
            throw new IllegalArgumentException("berths must be greater than 0");
        }
        if (quayCranes <= 0) {
            throw new IllegalArgumentException("quayCranes must be greater than 0");
        }
        if (movesPerHourPerCrane <= 0) {
            throw new IllegalArgumentException("movesPerHourPerCrane must be greater than 0");
        }
        if (arrivalRatePerDay <= 0) {
            throw new IllegalArgumentException("arrivalRatePerDay must be greater than 0");
        }

        return new CaucedoTerminalModel(
                berths,
                quayCranes,
                movesPerHourPerCrane,
                cranePolicy,
                arrivalRatePerDay
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
