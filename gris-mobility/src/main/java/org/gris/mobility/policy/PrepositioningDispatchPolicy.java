package org.gris.mobility.policy;

import org.gris.core.model.SimulationContext;
import org.gris.mobility.model.MobilityModel;
import org.gris.mobility.model.TripRequest;
import org.gris.mobility.model.Vehicle;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Pre-positioning dispatch policy:
 * Dispatches nearest idle vehicles to trip requests, and proactively rebalances idle
 * vehicles from zones with surplus capacity toward high-demand zones with vehicle deficits.
 */
public class PrepositioningDispatchPolicy extends NearestDispatchPolicy {

    private final double repositionThresholdRatio;

    public PrepositioningDispatchPolicy() {
        this(1.5);
    }

    public PrepositioningDispatchPolicy(double repositionThresholdRatio) {
        this.repositionThresholdRatio = repositionThresholdRatio;
    }

    @Override
    public String name() {
        return "PREPOSITIONING";
    }

    @Override
    public void onVehicleBecameIdle(Vehicle vehicle, MobilityModel model, SimulationContext ctx) {
        // First check if any unserved trip requests are pending
        TripRequest nextRequest = model.pollNextUnservedRequest();
        if (nextRequest != null) {
            model.dispatchVehicleToRequest(vehicle, nextRequest, ctx);
            return;
        }

        // No unserved requests pending: evaluate rebalancing opportunities
        evaluateRepositioning(vehicle, model, ctx);
    }

    private void evaluateRepositioning(Vehicle vehicle, MobilityModel model, SimulationContext ctx) {
        int currentZone = vehicle.getCurrentZoneId();
        List<Vehicle> allIdle = model.getIdleVehicles();

        // Group idle vehicles by zone
        Map<Integer, Long> idlePerZone = allIdle.stream()
                .collect(Collectors.groupingBy(Vehicle::getCurrentZoneId, Collectors.counting()));

        long idleInCurrentZone = idlePerZone.getOrDefault(currentZone, 0L);
        // Only reposition if current zone already has multiple idle vehicles
        if (idleInCurrentZone <= 1) {
            return;
        }

        // Find best target zone with demand but zero or deficient idle supply
        int bestTargetZone = -1;
        double maxDemandDeficit = 0.0;

        for (int zoneId : model.getDemand().getActiveZones()) {
            if (zoneId == currentZone) continue;

            long idleInTarget = idlePerZone.getOrDefault(zoneId, 0L);
            double arrivalRate = model.getDemand().getArrivalRatePerSecond(zoneId, ctx.now(), model.getDemandMultiplier());
            double travelTime = model.getMatrix().getTravelTimeSeconds(currentZone, zoneId);

            // Only consider reasonably reachable zones (under 15 minutes repositioning)
            if (travelTime > 900.0) continue;

            // Measure demand pressure against available supply
            double expectedArrivalsInWindow = arrivalRate * 600.0; // expected in next 10 mins
            double deficit = expectedArrivalsInWindow - idleInTarget;

            if (idleInTarget == 0 && deficit > maxDemandDeficit) {
                maxDemandDeficit = deficit;
                bestTargetZone = zoneId;
            }
        }

        if (bestTargetZone != -1 && maxDemandDeficit >= repositionThresholdRatio) {
            model.repositionVehicle(vehicle, bestTargetZone, ctx);
        }
    }
}
