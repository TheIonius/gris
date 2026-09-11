package org.gris.nl.eval;

import java.util.Map;

/**
 * Benchmark test case for scoring natural-language scenario extraction.
 */
public record EvaluationCase(
        String id,
        String prompt,
        String expectedModel,
        Map<String, Object> expectedParams,
        Double expectedHorizon,
        Integer expectedReplications,
        String expectedWarningSubstring
) {
}
