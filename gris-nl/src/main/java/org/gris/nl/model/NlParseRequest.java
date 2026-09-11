package org.gris.nl.model;

/**
 * Natural language scenario parse request.
 */
public record NlParseRequest(
        String prompt,
        Boolean execute
) {
    public boolean shouldExecute() {
        return Boolean.TRUE.equals(execute);
    }
}
