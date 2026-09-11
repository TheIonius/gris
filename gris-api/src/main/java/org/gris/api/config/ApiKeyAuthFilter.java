package org.gris.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;

/**
 * Optional API key authentication filter.
 * When 'gris.security.api-key' is configured (non-empty), requests to /api/** must provide
 * a valid token via the 'X-API-KEY' header or 'apiKey' query parameter (for SSE stream connections).
 * When unconfigured, all requests are permitted (open desktop/local mode).
 */
@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyAuthFilter.class);

    @Value("${gris.security.api-key:}")
    private String configuredApiKey;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // If no API key is configured, security is disabled (open access)
        if (configuredApiKey == null || configuredApiKey.trim().isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();

        // Only protect /api/** endpoints; allow static UI and OpenAPI docs
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Allow pre-flight OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract token from header or query param (for EventSource SSE)
        String requestApiKey = request.getHeader("X-API-KEY");
        if (requestApiKey == null || requestApiKey.isBlank()) {
            requestApiKey = request.getParameter("apiKey");
        }

        if (requestApiKey != null) {
            byte[] a = requestApiKey.trim().getBytes(StandardCharsets.UTF_8);
            byte[] b = configuredApiKey.trim().getBytes(StandardCharsets.UTF_8);
            if (MessageDigest.isEqual(a, b)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        log.warn("Unauthorized request to {}: missing or invalid API key", path);
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(String.format(
                "{\"timestamp\":\"%s\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Invalid or missing X-API-KEY authentication token\"}",
                Instant.now()
        ));
    }
}
