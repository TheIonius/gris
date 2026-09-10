package org.gris.core.model;

/**
 * The primary Model SPI contract.
 * <p>
 * Any domain (urban vehicle dispatch, container terminal, supply chain, healthcare queueing)
 * implements this interface. The core engine knows nothing about the concrete domain.
 */
public interface SimulationModel {

    /**
     * Human-readable domain model name.
     */
    String name();

    /**
     * Initializes model state, registers resource pools, schedules initial arrivals/events.
     *
     * @param ctx simulation context for scheduling and resource registration
     */
    void init(SimulationContext ctx);

    /**
     * Dispatches an event to the model handler.
     *
     * @param event the event being executed at current simulation time
     * @param ctx   simulation context for scheduling future events and updating state
     */
    void onEvent(Event event, SimulationContext ctx);
}
