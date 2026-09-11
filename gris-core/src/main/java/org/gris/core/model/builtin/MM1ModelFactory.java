package org.gris.core.model.builtin;

import org.gris.core.model.ModelParameterDefinition;
import org.gris.core.model.SimulationModel;
import org.gris.core.model.SimulationModelFactory;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Factory for creating configured MM1QueueModel instances.
 */
public class MM1ModelFactory implements SimulationModelFactory {

    @Override
    public String modelType() {
        return "mm1-queue";
    }

    @Override
    public String description() {
        return "M/M/1 or M/M/c queueing model with Poisson arrivals and exponential service times.";
    }

    @Override
    public Map<String, ModelParameterDefinition> parameterDefinitions() {
        Map<String, ModelParameterDefinition> params = new LinkedHashMap<>();
        params.put("lambda", ModelParameterDefinition.of("lambda", "DOUBLE", "Arrival rate (customers per time unit)", 0.5, true));
        params.put("mu", ModelParameterDefinition.of("mu", "DOUBLE", "Service rate per server (customers per time unit)", 1.0, true));
        params.put("warmup", ModelParameterDefinition.of("warmup", "DOUBLE", "Warmup time before collecting steady-state metrics", 2000.0, false));
        params.put("servers", ModelParameterDefinition.of("servers", "INT", "Number of identical parallel servers (c >= 1)", 1, false));
        return params;
    }

    @Override
    public SimulationModel createModel(Map<String, Object> parameters) {
        double lambda = getDouble(parameters, "lambda", 0.5);
        double mu = getDouble(parameters, "mu", 1.0);
        double warmup = getDouble(parameters, "warmup", 2000.0);
        int servers = getInt(parameters, "servers", 1);

        return new MM1QueueModel(lambda, mu, warmup, servers);
    }

    private double getDouble(Map<String, Object> params, String key, double defaultVal) {
        if (params == null || !params.containsKey(key)) return defaultVal;
        Object val = params.get(key);
        if (val instanceof Number num) return num.doubleValue();
        return Double.parseDouble(val.toString());
    }

    private int getInt(Map<String, Object> params, String key, int defaultVal) {
        if (params == null || !params.containsKey(key)) return defaultVal;
        Object val = params.get(key);
        if (val instanceof Number num) return num.intValue();
        return Integer.parseInt(val.toString());
    }
}
