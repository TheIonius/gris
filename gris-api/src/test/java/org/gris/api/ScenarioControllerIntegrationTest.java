package org.gris.api;

import org.gris.api.model.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ScenarioControllerIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    private String baseUrl() {
        return "http://localhost:" + port + "/api";
    }

    @Test
    @DisplayName("GET / serves the Gris React web dashboard single-page application")
    void testDashboardHtmlServedAtRoot() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                "http://localhost:" + port + "/",
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("<div id=\"root\"></div>");
    }

    @Test
    @DisplayName("GET /api/models returns registered model factories including mm1-queue")
    void testGetAvailableModels() {
        ResponseEntity<ModelInfoResponse[]> response = restTemplate.getForEntity(
                baseUrl() + "/models",
                ModelInfoResponse[].class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        List<ModelInfoResponse> models = List.of(response.getBody());
        assertThat(models).extracting(ModelInfoResponse::modelType).contains("mm1-queue");

        ModelInfoResponse mm1 = models.stream()
                .filter(m -> m.modelType().equals("mm1-queue"))
                .findFirst()
                .orElseThrow();

        assertThat(mm1.parameters()).containsKey("lambda");
        assertThat(mm1.parameters()).containsKey("mu");
        assertThat(mm1.parameters()).containsKey("warmup");
        assertThat(mm1.parameters()).containsKey("servers");
    }

    @Test
    @DisplayName("POST /api/scenarios executes async replications and yields valid 95% confidence intervals")
    void testSubmitAndPollScenario() {
        ScenarioCreateRequest request = new ScenarioCreateRequest(
                "Integration Test M/M/1",
                "Testing async Monte Carlo scenario submission and results",
                "mm1-queue",
                15_000.0,
                15,
                123456L,
                Map.of("lambda", 0.5, "mu", 1.0, "warmup", 1_000.0)
        );

        // Submit scenario
        ResponseEntity<ScenarioResponse> submitResponse = restTemplate.postForEntity(
                baseUrl() + "/scenarios",
                request,
                ScenarioResponse.class
        );

        assertThat(submitResponse.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(submitResponse.getBody()).isNotNull();

        String scenarioId = submitResponse.getBody().id();
        assertThat(scenarioId).isNotBlank();
        assertThat(submitResponse.getBody().status()).isIn(ScenarioStatus.RUNNING, ScenarioStatus.PENDING);

        // Await completion asynchronously
        await().atMost(10, TimeUnit.SECONDS).pollInterval(100, TimeUnit.MILLISECONDS).untilAsserted(() -> {
            ResponseEntity<ScenarioResponse> pollResponse = restTemplate.getForEntity(
                    baseUrl() + "/scenarios/" + scenarioId,
                    ScenarioResponse.class
            );

            assertThat(pollResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(pollResponse.getBody()).isNotNull();
            assertThat(pollResponse.getBody().status()).isEqualTo(ScenarioStatus.COMPLETED);
        });

        // Retrieve completed scenario
        ResponseEntity<ScenarioResponse> completedResponse = restTemplate.getForEntity(
                baseUrl() + "/scenarios/" + scenarioId,
                ScenarioResponse.class
        );

        ScenarioResponse completed = completedResponse.getBody();
        assertThat(completed).isNotNull();
        assertThat(completed.status()).isEqualTo(ScenarioStatus.COMPLETED);
        assertThat(completed.completedAt()).isNotNull();
        assertThat(completed.wallClockMs()).isPositive();

        ScenarioResultsResponse results = completed.results();
        assertThat(results).isNotNull();
        assertThat(results.totalEventsProcessed()).isPositive();

        // Validate statistical convergence: W = 1 / (mu - lambda) = 2.00
        double theoreticalW = 1.0 / (1.0 - 0.5); // 2.00
        double theoreticalRho = 0.5 / 1.0; // 0.50

        MetricSummaryResponse systemTime = results.sampleMetrics().get("steady.customer.system_time");
        assertThat(systemTime).isNotNull();
        assertThat(systemTime.replications()).isEqualTo(15);
        assertThat(systemTime.mean()).isCloseTo(theoreticalW, within(0.12));
        assertThat(theoreticalW)
                .as("95% CI must capture analytical W = 2.00")
                .isBetween(systemTime.confidenceInterval95Lower(), systemTime.confidenceInterval95Upper());

        MetricSummaryResponse utilization = results.timeWeightedMetrics().get("server.utilization");
        assertThat(utilization).isNotNull();
        assertThat(utilization.mean()).isCloseTo(theoreticalRho, within(0.04));

        MetricSummaryResponse arrived = results.counters().get("customers.arrived");
        assertThat(arrived).isNotNull();
        assertThat(arrived.mean()).isPositive();

        // Verify GET /api/scenarios list contains this scenario
        ResponseEntity<ScenarioResponse[]> listResponse = restTemplate.getForEntity(
                baseUrl() + "/scenarios",
                ScenarioResponse[].class
        );
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(List.of(listResponse.getBody())).extracting(ScenarioResponse::id).contains(scenarioId);
    }

    @Test
    @DisplayName("POST /api/scenarios with mobility-dispatch model runs successfully and produces fleet metrics")
    void testSubmitAndPollMobilityScenario() {
        ScenarioCreateRequest request = new ScenarioCreateRequest(
                "NYC Mobility Batched Test",
                "Testing NYC TLC urban mobility dispatch via REST API",
                "mobility-dispatch",
                3600.0, // 1 hour of simulation
                5,
                99999L,
                Map.of("fleetSize", 150, "policy", "BATCHED", "batchWindowSeconds", 15.0)
        );

        ResponseEntity<ScenarioResponse> submitResponse = restTemplate.postForEntity(
                baseUrl() + "/scenarios",
                request,
                ScenarioResponse.class
        );

        assertThat(submitResponse.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        String scenarioId = submitResponse.getBody().id();

        await().atMost(10, TimeUnit.SECONDS).pollInterval(100, TimeUnit.MILLISECONDS).untilAsserted(() -> {
            ResponseEntity<ScenarioResponse> pollResponse = restTemplate.getForEntity(
                    baseUrl() + "/scenarios/" + scenarioId,
                    ScenarioResponse.class
            );

            assertThat(pollResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(pollResponse.getBody().status()).isEqualTo(ScenarioStatus.COMPLETED);
        });

        ResponseEntity<ScenarioResponse> completedResponse = restTemplate.getForEntity(
                baseUrl() + "/scenarios/" + scenarioId,
                ScenarioResponse.class
        );

        ScenarioResponse completed = completedResponse.getBody();
        assertThat(completed).isNotNull();
        assertThat(completed.results().sampleMetrics()).containsKey("passenger.wait_time");
        assertThat(completed.results().timeWeightedMetrics()).containsKey("fleet.utilization");
        assertThat(completed.results().counters().get("trips.completed").mean()).isPositive();
    }


    @Test
    @DisplayName("POST /api/scenarios with caucedo-terminal model runs successfully and produces vessel metrics")
    void testSubmitAndPollTerminalScenario() {
        ScenarioCreateRequest request = new ScenarioCreateRequest(
                "Caucedo Terminal Integration Test",
                "Testing container terminal logistics via REST API",
                "caucedo-terminal",
                86400.0 * 3, // 3 days
                4,
                77777L,
                Map.of("berths", 3, "quayCranes", 8, "cranePolicy", "DYNAMIC", "arrivalRatePerDay", 4.0)
        );

        ResponseEntity<ScenarioResponse> submitResponse = restTemplate.postForEntity(
                baseUrl() + "/scenarios",
                request,
                ScenarioResponse.class
        );

        assertThat(submitResponse.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        String scenarioId = submitResponse.getBody().id();

        await().atMost(10, TimeUnit.SECONDS).pollInterval(100, TimeUnit.MILLISECONDS).untilAsserted(() -> {
            ResponseEntity<ScenarioResponse> pollResponse = restTemplate.getForEntity(
                    baseUrl() + "/scenarios/" + scenarioId,
                    ScenarioResponse.class
            );

            assertThat(pollResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(pollResponse.getBody().status()).isEqualTo(ScenarioStatus.COMPLETED);
        });

        ResponseEntity<ScenarioResponse> completedResponse = restTemplate.getForEntity(
                baseUrl() + "/scenarios/" + scenarioId,
                ScenarioResponse.class
        );

        ScenarioResponse completed = completedResponse.getBody();
        assertThat(completed).isNotNull();
        assertThat(completed.results().sampleMetrics()).containsKey("vessel.turnaround_time_hours");
        assertThat(completed.results().counters().get("vessels.served").mean()).isPositive();
        assertThat(completed.results().counters().get("containers.moved").mean()).isPositive();
    }


    @Test
    @DisplayName("POST /api/ask returns parsed confirmation contract without executing")
    void testAskEndpointConfirmationOnly() {
        NlAskRequest askReq = new NlAskRequest(
                "what if we lose 20% of vehicles in Brooklyn on Friday evening?",
                false
        );

        ResponseEntity<NlAskResponse> response = restTemplate.postForEntity(
                baseUrl() + "/ask",
                askReq,
                NlAskResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        NlAskResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.modelType()).isEqualTo("mobility-dispatch");
        assertThat(body.parameters()).containsEntry("fleetSize", 320);
        assertThat(body.confidence()).isGreaterThan(0.8);
        assertThat(body.valid()).isTrue();
        assertThat(body.scenario()).isNull();
    }

    @Test
    @DisplayName("POST /api/ask with execute=true automatically submits scenario and runs simulation")
    void testAskEndpointWithExecution() {
        NlAskRequest askReq = new NlAskRequest(
                "what if two cranes go down at Caucedo terminal?",
                true
        );

        ResponseEntity<NlAskResponse> response = restTemplate.postForEntity(
                baseUrl() + "/ask",
                askReq,
                NlAskResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        NlAskResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.modelType()).isEqualTo("caucedo-terminal");
        assertThat(body.parameters()).containsEntry("quayCranes", 6);
        assertThat(body.scenario()).isNotNull();

        String scenarioId = body.scenario().id();
        await().atMost(10, TimeUnit.SECONDS).pollInterval(100, TimeUnit.MILLISECONDS).untilAsserted(() -> {
            ResponseEntity<ScenarioResponse> poll = restTemplate.getForEntity(
                    baseUrl() + "/scenarios/" + scenarioId,
                    ScenarioResponse.class
            );
            assertThat(poll.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(poll.getBody().status()).isEqualTo(ScenarioStatus.COMPLETED);
        });
    }

    @Test
    @DisplayName("POST /api/scenarios returns 400 for invalid payloads")
    void testValidationFailure() {
        ScenarioCreateRequest invalidRequest = new ScenarioCreateRequest(
                "", // Blank name
                "invalid",
                "", // Blank modelType
                -100.0, // Negative horizon
                0, // Invalid replications
                null,
                Map.of()
        );

        ResponseEntity<Map> errorResponse = restTemplate.postForEntity(
                baseUrl() + "/scenarios",
                invalidRequest,
                Map.class
        );

        assertThat(errorResponse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorResponse.getBody()).containsKey("fieldErrors");
    }

    @Test
    @DisplayName("GET /swagger-ui.html and /v3/api-docs serve interactive OpenAPI documentation")
    void testOpenApiDocumentation() {
        ResponseEntity<String> swaggerResponse = restTemplate.getForEntity(
                "http://localhost:" + port + "/swagger-ui/index.html",
                String.class
        );
        assertThat(swaggerResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(swaggerResponse.getBody()).contains("swagger-ui");

        ResponseEntity<String> apiDocsResponse = restTemplate.getForEntity(
                "http://localhost:" + port + "/v3/api-docs",
                String.class
        );
        assertThat(apiDocsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(apiDocsResponse.getBody()).contains("Gris - Discrete-Event Simulation API");
    }

    @Test
    @DisplayName("POST /api/ask parses comparative policy inquiries into dual-branch scenario contracts")
    void testAskComparativeMobilityPolicies() {
        NlAskRequest askReq = new NlAskRequest(
                "Compare Nearest vs Batched dispatch with 400 vehicles",
                false
        );

        ResponseEntity<NlAskResponse> response = restTemplate.postForEntity(
                baseUrl() + "/ask",
                askReq,
                NlAskResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        NlAskResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isComparison()).isTrue();
        assertThat(body.comparisonA()).isNotNull();
        assertThat(body.comparisonB()).isNotNull();

        assertThat(body.comparisonA().modelType()).isEqualTo("mobility-dispatch");
        assertThat(body.comparisonA().parameters()).containsEntry("policy", "NEAREST");
        assertThat(body.comparisonA().parameters()).containsEntry("fleetSize", 400);

        assertThat(body.comparisonB().modelType()).isEqualTo("mobility-dispatch");
        assertThat(body.comparisonB().parameters()).containsEntry("policy", "BATCHED");
        assertThat(body.comparisonB().parameters()).containsEntry("fleetSize", 400);
    }

    @Test
    @DisplayName("POST /api/ask parses terminal capacity comparison inquiries")
    void testAskComparativeTerminalCapacity() {
        NlAskRequest askReq = new NlAskRequest(
                "Compare 4 vs 8 cranes in Caucedo terminal",
                false
        );

        ResponseEntity<NlAskResponse> response = restTemplate.postForEntity(
                baseUrl() + "/ask",
                askReq,
                NlAskResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        NlAskResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isComparison()).isTrue();
        assertThat(body.comparisonA().parameters()).containsEntry("quayCranes", 4);
        assertThat(body.comparisonB().parameters()).containsEntry("quayCranes", 8);
    }

    @Test
    @DisplayName("GET /api/scenarios/{id}/stream connects to SSE stream and receives event payload")
    void testSseStreamEndpoint() {
        ScenarioCreateRequest request = new ScenarioCreateRequest(
                "SSE Stream Test",
                "Testing Server-Sent Events stream connection",
                "mm1-queue",
                1000.0,
                2,
                42L,
                Map.of("lambda", 0.5, "mu", 1.0)
        );

        ResponseEntity<ScenarioResponse> submitResponse = restTemplate.postForEntity(
                baseUrl() + "/scenarios",
                request,
                ScenarioResponse.class
        );
        String scenarioId = submitResponse.getBody().id();

        ResponseEntity<String> sseResponse = restTemplate.getForEntity(
                baseUrl() + "/scenarios/" + scenarioId + "/stream",
                String.class
        );
        assertThat(sseResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(sseResponse.getHeaders().getContentType().toString()).contains("text/event-stream");
    }

    @Test
    @DisplayName("GET /api/scenarios/{id} returns 404 for unknown ID")
    void testNotFound() {
        ResponseEntity<Map> response = restTemplate.getForEntity(
                baseUrl() + "/scenarios/non-existent-id-12345",
                Map.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
