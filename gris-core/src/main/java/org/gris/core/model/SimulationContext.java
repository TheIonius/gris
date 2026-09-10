package org.gris.core.model;

import org.gris.core.metrics.MetricsRegistry;
import org.gris.core.random.RngStream;
import org.gris.core.resource.ResourcePool;

/**
 * Context provided to a domain model during simulation execution.
 * Allows models to inspect virtual time, schedule/cancel events, interact with resource pools,
 * draw from isolated RNG streams, and record custom metrics.
 */
public interface SimulationContext {

    /**
     * @return current virtual simulation time
     */
    double now();

    /**
     * Schedules an event at an absolute simulation time.
     */
    Event schedule(double time, String eventType, Object payload);

    /**
     * Schedules an event at an absolute simulation time with explicit priority.
     */
    Event schedule(double time, int priority, String eventType, Object payload);

    /**
     * Schedules an event at (now + delay).
     */
    Event scheduleAfter(double delay, String eventType, Object payload);

    /**
     * Schedules an event at (now + delay) with explicit priority.
     */
    Event scheduleAfter(double delay, int priority, String eventType, Object payload);

    /**
     * Cancels a scheduled event if it hasn't been executed yet.
     */
    boolean cancel(Event event);

    /**
     * Retrieves an existing registered resource pool by name.
     */
    ResourcePool getResourcePool(String name);

    /**
     * Registers a new resource pool with given capacity.
     */
    ResourcePool registerResourcePool(String name, int capacity);

    /**
     * Obtains an isolated, reproducible random number generator stream.
     */
    RngStream getRngStream(String name);

    /**
     * @return the metrics registry
     */
    MetricsRegistry metrics();
}
