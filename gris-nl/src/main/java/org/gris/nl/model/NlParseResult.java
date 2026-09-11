package org.gris.nl.model;

import java.util.List;
import java.util.Map;

/**
 * Confirmation contract returned after translating a natural language prompt.
 * Contains extracted configuration, reasoning, confidence score, and validation status.
 */
public record NlParseResult(
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
        boolean valid
) {
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String rawPrompt;
        private String modelType;
        private String suggestedName;
        private String description;
        private double horizon = 3600.0;
        private int replications = 10;
        private Long seed = 42L;
        private Map<String, Object> parameters = Map.of();
        private double confidence = 0.9;
        private String reasoning = "";
        private List<String> warnings = List.of();
        private boolean valid = true;

        public Builder rawPrompt(String rawPrompt) { this.rawPrompt = rawPrompt; return this; }
        public Builder modelType(String modelType) { this.modelType = modelType; return this; }
        public Builder suggestedName(String suggestedName) { this.suggestedName = suggestedName; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder horizon(double horizon) { this.horizon = horizon; return this; }
        public Builder replications(int replications) { this.replications = replications; return this; }
        public Builder seed(Long seed) { this.seed = seed; return this; }
        public Builder parameters(Map<String, Object> parameters) { this.parameters = parameters; return this; }
        public Builder confidence(double confidence) { this.confidence = confidence; return this; }
        public Builder reasoning(String reasoning) { this.reasoning = reasoning; return this; }
        public Builder warnings(List<String> warnings) { this.warnings = warnings; return this; }
        public Builder valid(boolean valid) { this.valid = valid; return this; }

        public NlParseResult build() {
            return new NlParseResult(
                    rawPrompt, modelType, suggestedName, description,
                    horizon, replications, seed, parameters,
                    confidence, reasoning, warnings, valid
            );
        }
    }
}
