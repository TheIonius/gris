package org.gris.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.gris.api.model.*;
import org.gris.api.repository.ScenarioEntity;
import org.gris.api.repository.ScenarioRepository;
import org.gris.core.engine.ReplicationReport;
import org.gris.core.engine.ReplicationRunner;
import org.gris.core.model.ModelRegistry;
import org.gris.core.model.SimulationModelFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import org.gris.api.config.ProgressTrackingExecutorService;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class ScenarioService {
    private static final Logger log = LoggerFactory.getLogger(ScenarioService.class);

    private final ScenarioRepository repository;
    private final ModelRegistry modelRegistry;
    private final ReplicationRunner replicationRunner;
    private final ObjectMapper objectMapper;

    private final Map<String, AtomicInteger> activeCompletedReps = new ConcurrentHashMap<>();
    private final Map<String, Integer> activeTotalReps = new ConcurrentHashMap<>();
    private final Map<String, List<org.springframework.web.servlet.mvc.method.annotation.SseEmitter>> scenarioEmitters = new ConcurrentHashMap<>();
    private final Set<String> cancelledScenarioIds = ConcurrentHashMap.newKeySet();
    private final Map<String, Thread> activeThreads = new ConcurrentHashMap<>();

    public ScenarioService(
            ScenarioRepository repository,
            ModelRegistry modelRegistry,
            ReplicationRunner replicationRunner,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.modelRegistry = modelRegistry;
        this.replicationRunner = replicationRunner;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        ProgressTrackingExecutorService.registerListener(this::incrementCompletedReplication);
    }

    public void incrementCompletedReplication(String scenarioId) {
        if (scenarioId == null) return;
        AtomicInteger counter = activeCompletedReps.get(scenarioId);
        if (counter != null) {
            int current = counter.incrementAndGet();
            log.debug("Scenario {} finished replication {}", scenarioId, current);
            notifyEmitters(scenarioId, false);
        }
    }

    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter subscribe(String id) {
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter =
                new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(180_000L);

        scenarioEmitters.computeIfAbsent(id, k -> new java.util.concurrent.CopyOnWriteArrayList<>()).add(emitter);

        Runnable cleanup = () -> {
            List<org.springframework.web.servlet.mvc.method.annotation.SseEmitter> list = scenarioEmitters.get(id);
            if (list != null) {
                list.remove(emitter);
                if (list.isEmpty()) {
                    scenarioEmitters.remove(id);
                }
            }
        };

        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        // Send initial state snapshot immediately upon connection
        getScenario(id).ifPresent(s -> {
            try {
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name("status")
                        .data(s));
                if (s.status() == ScenarioStatus.COMPLETED || s.status() == ScenarioStatus.FAILED) {
                    emitter.complete();
                }
            } catch (Exception e) {
                cleanup.run();
            }
        });

        return emitter;
    }

    private void notifyEmitters(String id, boolean complete) {
        List<org.springframework.web.servlet.mvc.method.annotation.SseEmitter> emitters = scenarioEmitters.get(id);
        if (emitters == null || emitters.isEmpty()) return;

        getScenario(id).ifPresent(s -> {
            List<org.springframework.web.servlet.mvc.method.annotation.SseEmitter> deadEmitters = new ArrayList<>();
            for (org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter : emitters) {
                try {
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                            .name(complete ? "complete" : "progress")
                            .data(s));
                    if (complete) {
                        emitter.complete();
                    }
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }
            emitters.removeAll(deadEmitters);
            if (complete || emitters.isEmpty()) {
                scenarioEmitters.remove(id);
            }
        });
    }

    /**
     * Submits a new simulation scenario for asynchronous execution.
     *
     * @param request scenario configuration payload
     * @return initial ScenarioResponse with PENDING/RUNNING status
     */
    public ScenarioResponse submitScenario(ScenarioCreateRequest request) {
        SimulationModelFactory factory = modelRegistry.getRequiredFactory(request.modelType());
        Map<String, Object> params = request.parameters() != null ? request.parameters() : Map.of();
        // Validate parameters eagerly against the factory
        factory.createModel(params);

        String id = UUID.randomUUID().toString();
        Instant now = Instant.now();
        String paramsJson = toJson(params);

        ScenarioEntity entity = new ScenarioEntity(
                id,
                request.name(),
                request.description(),
                request.modelType(),
                request.horizon(),
                request.replications(),
                request.seedBase(),
                ScenarioStatus.RUNNING,
                paramsJson,
                null,
                null,
                now,
                null,
                null
        );

        repository.insert(entity);
        log.info("Submitted scenario {} ('{}') for model '{}'", id, request.name(), request.modelType());

        activeCompletedReps.put(id, new AtomicInteger(0));
        activeTotalReps.put(id, request.replications());

        // Launch async execution
        executeScenarioAsync(id, factory, params, request.horizon(), request.replications(), request.seedBase());

        return toResponse(entity);
    }

    @Async
    public void executeScenarioAsync(
            String id,
            SimulationModelFactory factory,
            Map<String, Object> parameters,
            double horizon,
            int replications,
            long seedBase
    ) {
        ProgressTrackingExecutorService.CURRENT_SCENARIO_ID.set(id);
        activeThreads.put(id, Thread.currentThread());
        long startWall = System.currentTimeMillis();
        try {
            log.info("Executing scenario {} (model={}, reps={}, horizon={})",
                    id, factory.modelType(), replications, horizon);

            List<EventTraceEntry> eventTrace = new java.util.concurrent.CopyOnWriteArrayList<>();
            java.util.concurrent.atomic.AtomicBoolean hasWrapped = new java.util.concurrent.atomic.AtomicBoolean(false);

            ReplicationReport report = replicationRunner.runReplications(
                    () -> {
                        org.gris.core.model.SimulationModel baseModel = factory.createModel(parameters);
                        if (!hasWrapped.getAndSet(true)) {
                            return new TracingSimulationModel(baseModel, eventTrace, 50);
                        }
                        return baseModel;
                    },
                    horizon,
                    replications,
                    seedBase
            );

            long wallClockMs = System.currentTimeMillis() - startWall;

            if (cancelledScenarioIds.remove(id)) {
                log.info("Scenario {} was cancelled during execution, discarding completion results", id);
                return;
            }

            ScenarioResultsResponse resultsDto = ScenarioResultsResponse.from(report, eventTrace);
            String resultsJson = toJson(resultsDto);

            repository.updateStatusAndResults(
                    id,
                    ScenarioStatus.COMPLETED,
                    resultsJson,
                    null,
                    Instant.now(),
                    wallClockMs
            );
            log.info("Completed scenario {} in {} ms", id, wallClockMs);
            notifyEmitters(id, true);

        } catch (Exception e) {
            log.error("Scenario {} failed: {}", id, e.getMessage(), e);
            long wallClockMs = System.currentTimeMillis() - startWall;

            if (cancelledScenarioIds.remove(id)) {
                log.info("Scenario {} was cancelled during execution, discarding failure write", id);
                return;
            }

            repository.updateStatusAndResults(
                    id,
                    ScenarioStatus.FAILED,
                    null,
                    e.getMessage(),
                    Instant.now(),
                    wallClockMs
            );
            notifyEmitters(id, true);
        } finally {
            activeThreads.remove(id);
            ProgressTrackingExecutorService.CURRENT_SCENARIO_ID.remove();
            activeCompletedReps.remove(id);
            activeTotalReps.remove(id);
        }
    }

    public boolean abortScenario(String id) {
        Optional<ScenarioEntity> opt = repository.findById(id);
        if (opt.isEmpty()) return false;
        ScenarioEntity entity = opt.get();
        if (entity.status() != ScenarioStatus.RUNNING && entity.status() != ScenarioStatus.PENDING) {
            return false;
        }

        cancelledScenarioIds.add(id);
        Thread worker = activeThreads.get(id);
        if (worker != null) {
            worker.interrupt();
        }

        long wallClockMs = entity.createdAt() != null
                ? Instant.now().toEpochMilli() - entity.createdAt().toEpochMilli()
                : 0L;

        repository.updateStatusAndResults(
                id,
                ScenarioStatus.CANCELLED,
                null,
                "Simulation execution aborted by user",
                Instant.now(),
                wallClockMs
        );
        log.info("Aborted active scenario {}", id);
        notifyEmitters(id, true);
        return true;
    }

    public boolean deleteScenario(String id) {
        cancelledScenarioIds.remove(id);
        activeCompletedReps.remove(id);
        activeTotalReps.remove(id);
        scenarioEmitters.remove(id);
        return repository.deleteById(id);
    }

    public int deleteAllScenarios() {
        cancelledScenarioIds.clear();
        activeCompletedReps.clear();
        activeTotalReps.clear();
        scenarioEmitters.clear();
        return repository.deleteAll();
    }

    public Optional<ScenarioResponse> getScenario(String id) {
        return repository.findById(id).map(this::toResponse);
    }

    public List<ScenarioResponse> listScenarios() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    public List<ModelInfoResponse> getAvailableModels() {
        return modelRegistry.getAllFactories().values().stream()
                .map(ModelInfoResponse::from)
                .toList();
    }

    private ScenarioResponse toResponse(ScenarioEntity entity) {
        Map<String, Object> params = fromJson(entity.parametersJson(), new TypeReference<>() {});
        ScenarioResultsResponse results = fromJson(entity.resultsJson(), new TypeReference<>() {});

        ReplicationProgress progress;
        if (entity.status() == ScenarioStatus.COMPLETED) {
            progress = ReplicationProgress.of(entity.replications(), entity.replications());
        } else if (entity.status() == ScenarioStatus.RUNNING) {
            int completed = activeCompletedReps.containsKey(entity.id())
                    ? activeCompletedReps.get(entity.id()).get()
                    : 0;
            int total = activeTotalReps.getOrDefault(entity.id(), entity.replications());
            progress = ReplicationProgress.of(completed, total);
        } else {
            progress = ReplicationProgress.of(0, entity.replications());
        }

        return new ScenarioResponse(
                entity.id(),
                entity.name(),
                entity.description(),
                entity.modelType(),
                entity.horizon(),
                entity.replications(),
                entity.seedBase(),
                entity.status(),
                params,
                results,
                entity.errorMessage(),
                entity.createdAt(),
                entity.completedAt(),
                entity.wallClockMs(),
                progress
        );
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize to JSON", e);
        }
    }

    private <T> T fromJson(String json, TypeReference<T> typeRef) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, typeRef);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize JSON", e);
        }
    }
}
