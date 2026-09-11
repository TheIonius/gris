package org.gris.nl.parser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.gris.core.model.ModelRegistry;
import org.gris.nl.model.NlParseResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Optional LLM parser that delegates to an OpenAI-compatible / Ollama / DeepSeek endpoint
 * if configured, and seamlessly falls back to SemanticPromptParser when offline or unconfigured.
 */
public class LlmPromptParser implements ScenarioPromptParser {

    private static final Logger log = LoggerFactory.getLogger(LlmPromptParser.class);
    private final ScenarioPromptParser fallbackParser;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;
    private final String apiKey;
    private final String endpointUrl;
    private final String modelName;

    public LlmPromptParser() {
        this(new SemanticPromptParser());
    }

    public LlmPromptParser(ScenarioPromptParser fallbackParser) {
        this.fallbackParser = fallbackParser;
        this.apiKey = System.getenv("GRIS_LLM_API_KEY") != null ? System.getenv("GRIS_LLM_API_KEY") : System.getenv("OPENAI_API_KEY");
        this.endpointUrl = System.getenv().getOrDefault("GRIS_LLM_URL", "https://api.openai.com/v1/chat/completions");
        this.modelName = System.getenv().getOrDefault("GRIS_LLM_MODEL", "gpt-4o-mini");
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    @Override
    public NlParseResult parse(String prompt, ModelRegistry registry) {
        if (apiKey == null || apiKey.isBlank()) {
            return fallbackParser.parse(prompt, registry);
        }

        try {
            log.info("Querying LLM endpoint at {} for scenario extraction...", endpointUrl);
            String systemInstruction = """
                    You are Gris, a discrete-event simulation engine parser.
                    Extract simulation parameters for one of three models:
                    1. 'mm1-queue' (parameters: lambda, mu, servers, warmup)
                    2. 'mobility-dispatch' (parameters: fleetSize, policy [NEAREST, BATCHED, PREPOSITIONING], demandMultiplier, batchWindowSeconds, maxWaitTolerance)
                    3. 'caucedo-terminal' (parameters: berths, quayCranes, movesPerHourPerCrane, cranePolicy [STATIC, DYNAMIC], arrivalRatePerDay)

                    Return ONLY a JSON object with this schema:
                    {
                      "modelType": "...",
                      "suggestedName": "...",
                      "description": "...",
                      "horizon": 7200.0,
                      "replications": 10,
                      "seed": 42,
                      "parameters": { ... },
                      "confidence": 0.95,
                      "reasoning": "..."
                    }
                    """;

            Map<String, Object> requestBody = Map.of(
                    "model", modelName,
                    "response_format", Map.of("type", "json_object"),
                    "messages", List.of(
                            Map.of("role", "system", "content", systemInstruction),
                            Map.of("role", "user", "content", prompt)
                    ),
                    "temperature", 0.0
            );

            String requestJson = objectMapper.writeValueAsString(requestBody);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpointUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String content = root.path("choices").get(0).path("message").path("content").asText();
                JsonNode parsed = objectMapper.readTree(content);

                Map<String, Object> params = new HashMap<>();
                if (parsed.has("parameters")) {
                    parsed.get("parameters").fields().forEachRemaining(entry -> {
                        JsonNode val = entry.getValue();
                        if (val.isNumber()) {
                            params.put(entry.getKey(), val.numberValue());
                        } else if (val.isBoolean()) {
                            params.put(entry.getKey(), val.booleanValue());
                        } else {
                            params.put(entry.getKey(), val.asText());
                        }
                    });
                }

                return NlParseResult.builder()
                        .rawPrompt(prompt)
                        .modelType(parsed.path("modelType").asText("mobility-dispatch"))
                        .suggestedName(parsed.path("suggestedName").asText("LLM Generated Scenario"))
                        .description(parsed.path("description").asText())
                        .horizon(parsed.path("horizon").asDouble(7200.0))
                        .replications(parsed.path("replications").asInt(10))
                        .seed(parsed.path("seed").asLong(42L))
                        .parameters(params)
                        .confidence(parsed.path("confidence").asDouble(0.95))
                        .reasoning("LLM: " + parsed.path("reasoning").asText())
                        .warnings(List.of())
                        .valid(true)
                        .build();
            } else {
                log.warn("LLM request failed with HTTP status {}; falling back to semantic parser.", response.statusCode());
            }
        } catch (Exception e) {
            log.warn("Error calling LLM endpoint ({}). Falling back to semantic parser.", e.getMessage());
        }

        return fallbackParser.parse(prompt, registry);
    }
}
