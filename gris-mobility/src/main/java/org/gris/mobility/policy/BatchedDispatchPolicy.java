package org.gris.mobility.policy;

import org.gris.core.model.SimulationContext;
import org.gris.mobility.model.MobilityModel;
import org.gris.mobility.model.TripRequest;
import org.gris.mobility.model.Vehicle;

import java.util.*;

/**
 * Batched window dispatch policy:
 * Buffers incoming requests over a short time window (e.g., 20 seconds) and performs
 * global greedy minimum-cost matching between buffered requests and available vehicles.
 * Reduces total empty pickup mileage and system-wide mean passenger wait times.
 */
public class BatchedDispatchPolicy implements DispatchPolicy {

    private final double batchWindowSeconds;
    private final List<TripRequest> batchBuffer = new ArrayList<>();

    public BatchedDispatchPolicy() {
        this(20.0);
    }

    public BatchedDispatchPolicy(double batchWindowSeconds) {
        this.batchWindowSeconds = batchWindowSeconds;
    }

    @Override
    public String name() {
        return "BATCHED";
    }

    @Override
    public void init(MobilityModel model, SimulationContext ctx) {
        batchBuffer.clear();
        ctx.scheduleAfter(batchWindowSeconds, "BATCH_TICK", null);
    }

    @Override
    public void onTripRequest(TripRequest request, MobilityModel model, SimulationContext ctx) {
        batchBuffer.add(request);
    }

    @Override
    public void onVehicleBecameIdle(Vehicle vehicle, MobilityModel model, SimulationContext ctx) {
        // Vehicles are matched on batch ticks
    }

    @Override
    public void onTick(MobilityModel model, SimulationContext ctx) {
        if (!batchBuffer.isEmpty()) {
            List<Vehicle> idleVehicles = model.getIdleVehicles();
            if (!idleVehicles.isEmpty()) {
                matchBatch(idleVehicles, model, ctx);
            }
        }

        // Schedule next batch tick
        ctx.scheduleAfter(batchWindowSeconds, "BATCH_TICK", null);
    }

    private void matchBatch(List<Vehicle> idleVehicles, MobilityModel model, SimulationContext ctx) {
        record MatchCandidate(Vehicle vehicle, TripRequest request, double cost) {}

        List<MatchCandidate> candidates = new ArrayList<>();

        for (Vehicle v : idleVehicles) {
            for (TripRequest req : batchBuffer) {
                double travelTime = model.getMatrix().getTravelTimeSeconds(v.getCurrentZoneId(), req.getOriginZoneId());
                double age = ctx.now() - req.getRequestTime();
                // Cost function: travel time minus aging bonus to avoid passenger starvation
                double cost = travelTime - (age * 0.5);
                candidates.add(new MatchCandidate(v, req, cost));
            }
        }

        // Sort by minimum cost
        candidates.sort(Comparator.comparingDouble(MatchCandidate::cost));

        Set<String> assignedVehicles = new HashSet<>();
        Set<String> matchedRequests = new HashSet<>();

        for (MatchCandidate mc : candidates) {
            if (!assignedVehicles.contains(mc.vehicle().getId()) && !matchedRequests.contains(mc.request().getId())) {
                assignedVehicles.add(mc.vehicle().getId());
                matchedRequests.add(mc.request().getId());
                model.dispatchVehicleToRequest(mc.vehicle(), mc.request(), ctx);
            }
        }

        // Remove matched requests from buffer
        batchBuffer.removeIf(req -> matchedRequests.contains(req.getId()));
    }

    public double getBatchWindowSeconds() {
        return batchWindowSeconds;
    }
}
