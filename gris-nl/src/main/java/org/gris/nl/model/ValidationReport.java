package org.gris.nl.model;

import java.util.List;

/**
 * Output of schema and parameter bounds validation.
 */
public record ValidationReport(
        boolean valid,
        List<String> warnings,
        List<String> errors
) {
    public static ValidationReport success(List<String> warnings) {
        return new ValidationReport(true, warnings != null ? warnings : List.of(), List.of());
    }

    public static ValidationReport failure(List<String> errors, List<String> warnings) {
        return new ValidationReport(false, warnings != null ? warnings : List.of(), errors != null ? errors : List.of());
    }
}
