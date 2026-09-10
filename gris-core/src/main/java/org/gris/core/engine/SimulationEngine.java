package org.gris.core.engine;

import org.gris.core.metrics.MetricsRegistry;
import org.gris.core.model.Event;
import org.gris.core.model.SimulationContext;
import org.gris.core.model.SimulationModel;
import org.gris.core.random.RngManager;
import org.gris.core.random.RngStream;
import org.gris.core.resource.ResourcePool;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * The core discrete-event simulation engine.
 * Owns the simulation clock, deterministic event calendar, RNG manager,
 * metrics registry, and resource pools.
 */
public class SimulationEngine implements SimulationContext {
    private static final Logger log = LoggerFactory.getLogger(SimulationEngine.class);

    private final long masterSeed;
    private final SimulationClock clock;
    private final EventCalendar calendar;
    private final RngManager rngManager;
    private final MetricsRegistry metricsRegistry;
    private final Map<String, ResourcePool> resourcePools = new ConcurrentHashMap<>();
    private final AtomicLong sequenceGenerator = new AtomicLong(0);

    public SimulationEngine(long masterSeed) {
        this.masterSeed = masterSeed;
        this.clock = new SimulationClock(0.0);
        this.calendar = new EventCalendar();
        this.rngManager = new RngManager(masterSeed);
        this.metricsRegistry = new MetricsRegistry();
    }

    /**
     * Executes the simulation model up to the specified time horizon.
     *
     * @param model   the domain model implementing the SimulationModel SPI
     * @param horizon the maximum virtual time horizon
     * @return result summary with all collected metrics
     */
    public SimulationResult run(SimulationModel model, double horizon) {
        Objects.requireNonNull(model, "Simulation model cannot be null");
        if (horizon <= 0) {
            throw new IllegalArgumentException("Simulation horizon must be positive, got: " + horizon);
        }

        long startWallTime = System.currentTimeMillis();
        log.info("Starting simulation of model '{}' with masterSeed={} to horizon={}",
                model.name(), masterSeed, horizon);

        // Reset state
        clock.reset(0.0);
        calendar.clear();
        sequenceGenerator.set(0);
        resourcePools.clear();
        metricsRegistry.reset(0.0);
        rngManager.reset();

        // Initialize model
        model.init(this);

        // Event processing loop
        while (!calendar.isEmpty()) {
            if (Thread.currentThread().isInterrupted()) {
                log.warn("Simulation thread interrupted, halting event processing at virtual t={}", clock.now());
                break;
            }

            Event nextEvent = calendar.peek();
            if (nextEvent.time() > horizon) {
                break;
            }

            Event event = calendar.poll();
            clock.advanceTo(event.time());
            model.onEvent(event, this);
        }

        // Finalize clock and continuous metrics to horizon
        if (clock.now() < horizon) {
            clock.advanceTo(horizon);
        }
        metricsRegistry.finalizeToTime(horizon);

        long wallClockMillis = System.currentTimeMillis() - startWallTime;
        long processed = calendar.getTotalProcessedCount();
        long scheduled = calendar.getTotalScheduledCount();

        log.info("Completed simulation: processed {} events in {} ms (virtual t={})",
                processed, wallClockMillis, clock.now());

        return new SimulationResult(
                model.name(),
                masterSeed,
                horizon,
                clock.now(),
                processed,
                scheduled,
                wallClockMillis,
                metricsRegistry
        );
    }

    @Override
    public double now() {
        return clock.now();
    }

    @Override
    public Event schedule(double time, String eventType, Object payload) {
        return schedule(time, 0, eventType, payload);
    }

    @Override
    public Event schedule(double time, int priority, String eventType, Object payload) {
        if (time < clock.now()) {
            throw new IllegalArgumentException(String.format(
                    "Cannot schedule event in the past: time=%f, current=%f", time, clock.now()));
        }
        long seq = sequenceGenerator.incrementAndGet();
        Event event = new Event(seq, time, priority, eventType, payload);
        calendar.schedule(event);
        return event;
    }

    @Override
    public Event scheduleAfter(double delay, String eventType, Object payload) {
        return scheduleAfter(delay, 0, eventType, payload);
    }

    @Override
    public Event scheduleAfter(double delay, int priority, String eventType, Object payload) {
        if (delay < 0) {
            throw new IllegalArgumentException("Event delay cannot be negative: " + delay);
        }
        return schedule(clock.now() + delay, priority, eventType, payload);
    }

    @Override
    public boolean cancel(Event event) {
        return calendar.cancel(event);
    }

    @Override
    public ResourcePool getResourcePool(String name) {
        ResourcePool pool = resourcePools.get(name);
        if (pool == null) {
            throw new IllegalArgumentException("Resource pool not found: " + name);
        }
        return pool;
    }

    @Override
    public ResourcePool registerResourcePool(String name, int capacity) {
        if (resourcePools.containsKey(name)) {
            throw new IllegalStateException("Resource pool already registered: " + name);
        }
        ResourcePool pool = new ResourcePool(name, capacity, clock.now(), metricsRegistry);
        resourcePools.put(name, pool);
        return pool;
    }

    @Override
    public RngStream getRngStream(String name) {
        return rngManager.getStream(name);
    }

    @Override
    public MetricsRegistry metrics() {
        return metricsRegistry;
    }

    public SimulationClock getClock() {
        return clock;
    }

    public EventCalendar getCalendar() {
        return calendar;
    }

    public RngManager getRngManager() {
        return rngManager;
    }

    public long getMasterSeed() {
        return masterSeed;
    }
}
