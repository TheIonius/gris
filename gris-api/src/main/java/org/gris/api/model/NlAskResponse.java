package org.gris.api.model;

import java.util.List;
import java.util.Map;

/**
 * Natural language scenario confirmation contract and optional execution response.
 */
public record NlAskResponse(
        String rawPrompt,
        String modelType,
        String suggestedName,
        String description,
        double horizon,
        int replications,
        Long seed,
        Map<String, Object> parameters,
        double confidence,
        String reasoning,
        List<String> warnings,
        boolean valid,
        ScenarioResponse scenario,
        boolean isComparison,
        NlAskResponse comparisonA,
        NlAskResponse comparisonB
) {
    public static NlAskResponse single(
            String rawPrompt,
            String modelType,
            String suggestedName,
            String description,
            double horizon,
            int replications,
            Long seed,
            Map<String, Object> parameters,
            double confidence,
            String reasoning,
            List<String> warnings,
            boolean valid,
            ScenarioResponse scenario
    ) {
        return new NlAskResponse(
                rawPrompt, modelType, suggestedName, description, horizon, replications, seed,
                parameters, confidence, reasoning, warnings, valid, scenario,
                false, null, null
        );
    }

    public static NlAskResponse comparison(
            String rawPrompt,
            NlAskResponse a,
            NlAskResponse b,
            String reasoning
    ) {
        return new NlAskResponse(
                rawPrompt,
                a.modelType(),
                "Comparison: " + a.suggestedName() + " vs " + b.suggestedName(),
                "Direct comparative simulation between two scenario configurations.",
                a.horizon(),
                Math.max(a.replications(), b.replications()),
                a.seed(),
                a.parameters(),
                Math.min(a.confidence(), b.confidence()),
                reasoning,
                List.of(),
                a.valid() && b.valid(),
                null,
                true,
                a,
                b
        );
    }
}
