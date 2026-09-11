package org.gris.api.controller;

import jakarta.validation.Valid;
import org.gris.api.model.ModelInfoResponse;
import org.gris.api.model.*;
import org.gris.api.model.NlAskResponse;
import org.gris.api.service.NlService;
import org.gris.api.service.ScenarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api")
public class ScenarioController {

    private final ScenarioService scenarioService;
    private final NlService nlService;
    private final org.gris.api.service.SweepService sweepService;

    public ScenarioController(
            ScenarioService scenarioService,
            NlService nlService,
            org.gris.api.service.SweepService sweepService
    ) {
        this.scenarioService = scenarioService;
        this.nlService = nlService;
        this.sweepService = sweepService;
    }

    /**
     * Execute a multi-point parameter sensitivity sweep along a specific parameter axis.
     */
    @PostMapping("/sweeps")
    public ResponseEntity<SweepResponse> runSweep(@Valid @RequestBody SweepRequest request) {
        SweepResponse response = sweepService.runSweep(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Natural-language query interface: parse natural language scenario prompts,
     * return confirmation contract and optionally execute the simulation.
     */
    @PostMapping("/ask")
    public ResponseEntity<NlAskResponse> askScenario(@Valid @RequestBody NlAskRequest request) {
        NlAskResponse response = nlService.processPrompt(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Submit a new simulation scenario for asynchronous Monte Carlo execution.
     */
    @PostMapping("/scenarios")
    public ResponseEntity<ScenarioResponse> submitScenario(@Valid @RequestBody ScenarioCreateRequest request) {
        ScenarioResponse response = scenarioService.submitScenario(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * Retrieve the details, status, and results of a specific scenario.
     */
    @GetMapping("/scenarios/{id}")
    public ResponseEntity<ScenarioResponse> getScenario(@PathVariable("id") String id) {
        return scenarioService.getScenario(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NoSuchElementException("Scenario not found with ID: " + id));
    }

    /**
     * Subscribe to live Server-Sent Events stream for real-time replication progress and completion.
     */
    @GetMapping(value = "/scenarios/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamScenario(@PathVariable("id") String id) {
        return scenarioService.subscribe(id);
    }

    /**
     * List all submitted scenarios ordered by creation time descending.
     */
    @GetMapping("/scenarios")
    public ResponseEntity<List<ScenarioResponse>> listScenarios() {
        return ResponseEntity.ok(scenarioService.listScenarios());
    }

    /**
     * Discover all registered simulation domain models and their parameter schemas.
     */
    @GetMapping("/models")
    public ResponseEntity<List<ModelInfoResponse>> listModels() {
        return ResponseEntity.ok(scenarioService.getAvailableModels());
    }

    /**
     * Abort an active running or pending scenario execution.
     */
    @PostMapping("/scenarios/{id}/abort")
    public ResponseEntity<Void> abortScenario(@PathVariable("id") String id) {
        boolean aborted = scenarioService.abortScenario(id);
        return aborted ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    /**
     * Delete a scenario record by ID.
     */
    @DeleteMapping("/scenarios/{id}")
    public ResponseEntity<Void> deleteScenario(@PathVariable("id") String id) {
        boolean deleted = scenarioService.deleteScenario(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    /**
     * Delete all scenario records (history cleanup).
     */
    @DeleteMapping("/scenarios")
    public ResponseEntity<Void> deleteAllScenarios() {
        scenarioService.deleteAllScenarios();
        return ResponseEntity.noContent().build();
    }
}
