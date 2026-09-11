package org.gris.mobility.policy;

import org.gris.core.model.SimulationContext;
import org.gris.mobility.model.MobilityModel;
import org.gris.mobility.model.TripRequest;
import org.gris.mobility.model.Vehicle;

import java.util.List;

/**
 * Baseline greedy dispatch policy:
 * Matches incoming trip requests to the nearest idle vehicle (by minimum travel time).
 * If no vehicle is available, queues the request in FCFS order.
 */
public class NearestDispatchPolicy implements DispatchPolicy {

    @Override
    public String name() {
        return "NEAREST";
    }

    @Override
    public void onTripRequest(TripRequest request, MobilityModel model, SimulationContext ctx) {
        List<Vehicle> idleVehicles = model.getIdleVehicles();
        if (idleVehicles.isEmpty()) {
            model.enqueueUnservedRequest(request);
            return;
        }

        Vehicle bestVehicle = findNearestVehicle(idleVehicles, request.getOriginZoneId(), model);
        model.dispatchVehicleToRequest(bestVehicle, request, ctx);
    }

    @Override
    public void onVehicleBecameIdle(Vehicle vehicle, MobilityModel model, SimulationContext ctx) {
        TripRequest nextRequest = model.pollNextUnservedRequest();
        if (nextRequest != null) {
            model.dispatchVehicleToRequest(vehicle, nextRequest, ctx);
        }
    }

    private Vehicle findNearestVehicle(List<Vehicle> vehicles, int pickupZoneId, MobilityModel model) {
        Vehicle best = null;
        double minTravelTime = Double.POSITIVE_INFINITY;

        for (Vehicle v : vehicles) {
            double time = model.getMatrix().getTravelTimeSeconds(v.getCurrentZoneId(), pickupZoneId);
            if (time < minTravelTime) {
                minTravelTime = time;
                best = v;
            }
        }
        return best;
    }
}
