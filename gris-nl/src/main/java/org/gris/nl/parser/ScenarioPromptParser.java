package org.gris.nl.parser;

import org.gris.core.model.ModelRegistry;
import org.gris.nl.model.NlParseResult;

/**
 * Contract for translating natural-language scenario descriptions into structured simulation configurations.
 */
public interface ScenarioPromptParser {

    /**
     * Parses a natural language scenario prompt into a structured NlParseResult.
     *
     * @param prompt   the user's scenario inquiry (e.g. "what if we lose 20% of vehicles in Brooklyn on Friday evening?")
     * @param registry the active model registry to validate and discover available models
     * @return confirmation contract with parsed parameters, reasoning, and validation status
     */
    NlParseResult parse(String prompt, ModelRegistry registry);
}
