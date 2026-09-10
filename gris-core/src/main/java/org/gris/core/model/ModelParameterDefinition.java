package org.gris.core.model;

/**
 * Declares metadata for a configurable parameter accepted by a domain model factory.
 */
public record ModelParameterDefinition(
        String name,
        String type, // "DOUBLE", "INT", "STRING", "BOOLEAN"
        String description,
        Object defaultValue,
        boolean required
) {
    public static ModelParameterDefinition of(String name, String type, String description, Object defaultValue, boolean required) {
        return new ModelParameterDefinition(name, type, description, defaultValue, required);
    }
}
