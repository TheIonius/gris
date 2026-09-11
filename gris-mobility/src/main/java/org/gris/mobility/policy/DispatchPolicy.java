package org.gris.mobility.policy;

import org.gris.core.model.SimulationContext;
import org.gris.mobility.model.MobilityModel;
import org.gris.mobility.model.TripRequest;
import org.gris.mobility.model.Vehicle;

/**
 * Strategy interface for fleet vehicle dispatch and rebalancing policies.
 */
public interface DispatchPolicy {

    /**
     * Unique policy identifier (e.g. "NEAREST", "BATCHED", "PREPOSITIONING").
     */
    String name();

    /**
     * Called during simulation model initialization.
     */
    default void init(MobilityModel model, SimulationContext ctx) {}

    /**
     * Invoked immediately when a new trip request arrives.
     */
    void onTripRequest(TripRequest request, MobilityModel model, SimulationContext ctx);

    /**
     * Invoked when a vehicle drops off a passenger or completes repositioning and becomes IDLE.
     */
    void onVehicleBecameIdle(Vehicle vehicle, MobilityModel model, SimulationContext ctx);

    /**
     * Periodic tick for windowed/batch matching policies.
     */
    default void onTick(MobilityModel model, SimulationContext ctx) {}
}
