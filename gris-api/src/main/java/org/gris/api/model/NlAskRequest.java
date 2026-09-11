package org.gris.api.model;

import jakarta.validation.constraints.NotBlank;

/**
 * Natural language scenario request payload.
 */
public record NlAskRequest(
        @NotBlank(message = "Prompt cannot be blank")
        String prompt,
        Boolean execute
) {
    public boolean shouldExecute() {
        return Boolean.TRUE.equals(execute);
    }
}
