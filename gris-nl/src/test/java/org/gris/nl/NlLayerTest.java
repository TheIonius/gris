package org.gris.nl;

import org.gris.core.model.ModelRegistry;
import org.gris.core.model.builtin.MM1ModelFactory;
import org.gris.nl.eval.NlEvaluationHarness;
import org.gris.nl.model.NlParseResult;
import org.gris.nl.model.ValidationReport;
import org.gris.nl.parser.SemanticPromptParser;
import org.gris.nl.validator.ScenarioBoundsValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class NlLayerTest {

    private static final Logger log = LoggerFactory.getLogger(NlLayerTest.class);

    private ModelRegistry registry;
    private SemanticPromptParser parser;
    private ScenarioBoundsValidator validator;

    @BeforeEach
    void setUp() {
        registry = new ModelRegistry();
        registry.register(new MM1ModelFactory());
        registry.discoverViaServiceLoader();
        parser = new SemanticPromptParser();
        validator = new ScenarioBoundsValidator();
    }

    @Test
    @DisplayName("Evaluation Harness: Scores 30 diverse natural language scenario queries (target >= 95%)")
    void testEvaluationHarnessAccuracy() {
        NlEvaluationHarness harness = new NlEvaluationHarness();
        NlEvaluationHarness.BenchmarkSummary summary = harness.evaluate(parser, registry);

        log.info("=== NL SCENARIO EXTRACTION BENCHMARK SUMMARY ===");
        log.info("Total Cases: {}", summary.totalCases());
        log.info("Passed:      {}", summary.passedCases());
        log.info("Accuracy:    {}%", String.format("%.1f", summary.accuracy()));

        for (var report : summary.reports()) {
            if (!report.passed()) {
                log.error("FAILED CASE [{}]: '{}' -> {}", report.id(), report.prompt(), report.failureReason());
            } else {
                log.debug("PASSED CASE [{}]: '{}'", report.id(), report.prompt());
            }
        }

        assertThat(summary.accuracy()).isGreaterThanOrEqualTo(95.0);
    }

    @Test
    @DisplayName("Bounds Validator: Warns on mathematically unstable M/M/1 queue (lambda >= mu * c)")
    void testUnstableQueueWarning() {
        ValidationReport report = validator.validate(
                "mm1-queue",
                1000.0,
                5,
                Map.of("lambda", 1.5, "mu", 1.0, "servers", 1),
                registry
        );

        assertThat(report.valid()).isTrue();
        assertThat(report.warnings()).anyMatch(w -> w.contains("Unstable queue"));
    }

    @Test
    @DisplayName("Bounds Validator: Rejects negative rates and empty models")
    void testValidationRejections() {
        ValidationReport badModel = validator.validate(
                "non-existent-model",
                1000.0,
                5,
                Map.of(),
                registry
        );
        assertThat(badModel.valid()).isFalse();
        assertThat(badModel.errors()).anyMatch(e -> e.contains("Unknown model type"));

        ValidationReport badRates = validator.validate(
                "mm1-queue",
                1000.0,
                5,
                Map.of("lambda", -0.5, "mu", 0.0),
                registry
        );
        assertThat(badRates.valid()).isFalse();
        assertThat(badRates.errors()).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    @DisplayName("Confirmation Contract: Returns structured JSON configuration and reasoning before execution")
    void testConfirmationContract() {
        String prompt = "what if we lose 20% of vehicles in Brooklyn on Friday evening?";
        NlParseResult result = parser.parse(prompt, registry);

        assertThat(result.valid()).isTrue();
        assertThat(result.modelType()).isEqualTo("mobility-dispatch");
        assertThat(result.confidence()).isGreaterThan(0.85);
        assertThat(result.parameters()).containsEntry("fleetSize", 320);
        assertThat(result.reasoning()).contains("20% vehicle fleet reduction");
        assertThat(result.suggestedName()).isNotBlank();
        assertThat(result.description()).isNotBlank();
    }
}
