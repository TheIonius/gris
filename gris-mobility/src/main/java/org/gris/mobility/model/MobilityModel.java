package org.gris.mobility.model;

import org.gris.core.model.Entity;
import org.gris.core.model.Event;
import org.gris.core.model.SimulationContext;
import org.gris.core.model.SimulationModel;
import org.gris.core.random.RngStream;
import org.gris.mobility.data.DemandDistributions;
import org.gris.mobility.data.ZoneMatrix;
import org.gris.mobility.policy.DispatchPolicy;

import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Simulation model for urban vehicle mobility and taxi dispatch across NYC zones.
 */
public class MobilityModel implements SimulationModel {

    private final ZoneMatrix matrix;
    private final DemandDistributions demand;
    private final DispatchPolicy policy;
    private final int fleetSize;
    private final double demandMultiplier;
    private final double maxWaitTolerance;

    private final List<Vehicle> vehicles = new ArrayList<>();
    private final Queue<TripRequest> unservedRequests = new ConcurrentLinkedQueue<>();
    private final Map<String, TripRequest> activeRequests = new HashMap<>();

    private RngStream arrivalStream;
    private RngStream destinationStream;
    private RngStream trafficStream;

    private long requestCounter = 0;
    private int busyVehicleCount = 0;

    public MobilityModel(
            ZoneMatrix matrix,
            DemandDistributions demand,
            DispatchPolicy policy,
            int fleetSize,
            double demandMultiplier,
            double maxWaitTolerance
    ) {
        this.matrix = matrix;
        this.demand = demand;
        this.policy = policy;
        this.fleetSize = fleetSize;
        this.demandMultiplier = demandMultiplier;
        this.maxWaitTolerance = maxWaitTolerance;
    }

    @Override
    public String name() {
        return "MobilityModel-" + policy.name();
    }

    @Override
    public void init(SimulationContext ctx) {
        vehicles.clear();
        unservedRequests.clear();
        activeRequests.clear();
        requestCounter = 0;
        busyVehicleCount = 0;

        this.arrivalStream = ctx.getRngStream("arrivals");
        this.destinationStream = ctx.getRngStream("destinations");
        this.trafficStream = ctx.getRngStream("traffic");

        // Distribute fleet across zones proportional to active zones
        List<Integer> activeZones = new ArrayList<>(demand.getActiveZones());
        for (int i = 0; i < fleetSize; i++) {
            int zoneId = activeZones.get(i % activeZones.size());
            vehicles.add(new Vehicle("veh-" + (i + 1), zoneId));
        }

        // Initialize continuous time-weighted utilization metric
        ctx.metrics().getOrCreateTimeWeightedMetric("fleet.utilization", ctx.now(), 0.0);

        // Schedule initial trip arrivals for all zones
        for (int zoneId : activeZones) {
            scheduleNextArrival(zoneId, ctx);
        }

        // Initialize policy
        policy.init(this, ctx);
    }

    @Override
    public void onEvent(Event event, SimulationContext ctx) {
        switch (event.type()) {
            case "TRIP_ARRIVAL" -> handleTripArrival(event, ctx);
            case "PICKUP" -> handlePickup(event, ctx);
            case "DROPOFF" -> handleDropoff(event, ctx);
            case "REPOSITION_ARRIVAL" -> handleRepositionArrival(event, ctx);
            case "BATCH_TICK" -> policy.onTick(this, ctx);
            case "CUSTOMER_CANCELLATION" -> handleCancellation(event, ctx);
            default -> throw new IllegalArgumentException("Unknown event type: " + event.type());
        }
    }

    private void handleTripArrival(Event event, SimulationContext ctx) {
        int originZoneId = (Integer) event.payload();
        scheduleNextArrival(originZoneId, ctx);

        double u = destinationStream.nextDouble();
        int destinationZoneId = demand.sampleDestinationZone(originZoneId, u);

        String requestId = "req-" + (++requestCounter);
        TripRequest request = new TripRequest(requestId, originZoneId, destinationZoneId, ctx.now(), maxWaitTolerance);
        activeRequests.put(requestId, request);

        ctx.metrics().incrementCounter("trips.requested");

        // Schedule customer cancellation event if wait exceeds tolerance
        ctx.scheduleAfter(maxWaitTolerance, "CUSTOMER_CANCELLATION", requestId);

        // Notify dispatch policy
        policy.onTripRequest(request, this, ctx);
    }

    private void scheduleNextArrival(int zoneId, SimulationContext ctx) {
        double rate = demand.getArrivalRatePerSecond(zoneId, ctx.now(), demandMultiplier);
        if (rate > 0) {
            double delay = arrivalStream.exponential(rate);
            ctx.scheduleAfter(delay, "TRIP_ARRIVAL", zoneId);
        }
    }

    public void dispatchVehicleToRequest(Vehicle vehicle, TripRequest request, SimulationContext ctx) {
        if (!vehicle.isIdle()) return;
        if (request.isCancelled()) return;

        vehicle.setStatus(VehicleStatus.EN_ROUTE_PICKUP);
        request.setAssignedVehicleId(vehicle.getId());
        unservedRequests.remove(request);

        updateBusyCount(1, ctx);

        double travelToPickup = matrix.getTravelTimeSeconds(vehicle.getCurrentZoneId(), request.getOriginZoneId());
        vehicle.recordEmptyTravel(travelToPickup);

        ctx.scheduleAfter(travelToPickup, "PICKUP", new TripAssignment(vehicle, request));
    }

    private void handlePickup(Event event, SimulationContext ctx) {
        TripAssignment assignment = (TripAssignment) event.payload();
        Vehicle vehicle = assignment.vehicle();
        TripRequest request = assignment.request();

        if (request.isCancelled()) {
            vehicle.setStatus(VehicleStatus.IDLE);
            updateBusyCount(-1, ctx);
            policy.onVehicleBecameIdle(vehicle, this, ctx);
            return;
        }

        request.setPickupTime(ctx.now());
        vehicle.setStatus(VehicleStatus.OCCUPIED);
        vehicle.setCurrentZoneId(request.getOriginZoneId());

        double waitTime = request.getWaitTime();
        ctx.metrics().getOrCreateSampleMetric("passenger.wait_time").record(waitTime);

        // Calculate travel time to destination with realistic traffic variation
        double baseTravelTime = matrix.getTravelTimeSeconds(request.getOriginZoneId(), request.getDestinationZoneId());
        double trafficFactor = 0.95 + (trafficStream.nextDouble() * 0.10); // +/- 5% traffic variation
        double tripDuration = baseTravelTime * trafficFactor;

        ctx.scheduleAfter(tripDuration, "DROPOFF", assignment);
    }

    private void handleDropoff(Event event, SimulationContext ctx) {
        TripAssignment assignment = (TripAssignment) event.payload();
        Vehicle vehicle = assignment.vehicle();
        TripRequest request = assignment.request();

        request.setDropoffTime(ctx.now());
        vehicle.setCurrentZoneId(request.getDestinationZoneId());
        vehicle.setStatus(VehicleStatus.IDLE);
        vehicle.recordCompletedTrip(request.getTripDuration());

        updateBusyCount(-1, ctx);

        ctx.metrics().incrementCounter("trips.completed");
        ctx.metrics().getOrCreateSampleMetric("trip.duration").record(request.getTripDuration());

        activeRequests.remove(request.getId());

        // Notify dispatch policy that vehicle is now IDLE
        policy.onVehicleBecameIdle(vehicle, this, ctx);
    }

    public void repositionVehicle(Vehicle vehicle, int targetZoneId, SimulationContext ctx) {
        if (!vehicle.isIdle()) return;

        vehicle.setStatus(VehicleStatus.REPOSITIONING);
        updateBusyCount(1, ctx);

        double travelTime = matrix.getTravelTimeSeconds(vehicle.getCurrentZoneId(), targetZoneId);
        vehicle.recordEmptyTravel(travelTime);

        ctx.scheduleAfter(travelTime, "REPOSITION_ARRIVAL", new RepositionAssignment(vehicle, targetZoneId));
    }

    private void handleRepositionArrival(Event event, SimulationContext ctx) {
        RepositionAssignment assign = (RepositionAssignment) event.payload();
        Vehicle vehicle = assign.vehicle();
        vehicle.setCurrentZoneId(assign.targetZoneId());
        vehicle.setStatus(VehicleStatus.IDLE);

        updateBusyCount(-1, ctx);
        ctx.metrics().incrementCounter("trips.repositioned");

        policy.onVehicleBecameIdle(vehicle, this, ctx);
    }

    private void handleCancellation(Event event, SimulationContext ctx) {
        String requestId = (String) event.payload();
        TripRequest request = activeRequests.get(requestId);
        if (request != null && request.getPickupTime() < 0 && !request.isCancelled()) {
            request.setCancelled(true);
            unservedRequests.remove(request);
            ctx.metrics().incrementCounter("trips.unfulfilled");
        }
    }

    private void updateBusyCount(int delta, SimulationContext ctx) {
        busyVehicleCount += delta;
        double utilization = (double) busyVehicleCount / (double) fleetSize;
        ctx.metrics().getOrCreateTimeWeightedMetric("fleet.utilization", 0.0, 0.0).update(ctx.now(), utilization);
    }

    public List<Vehicle> getIdleVehicles() {
        return vehicles.stream().filter(Vehicle::isIdle).toList();
    }

    public void enqueueUnservedRequest(TripRequest request) {
        if (!unservedRequests.contains(request) && !request.isCancelled()) {
            unservedRequests.add(request);
        }
    }

    public TripRequest pollNextUnservedRequest() {
        while (!unservedRequests.isEmpty()) {
            TripRequest req = unservedRequests.poll();
            if (req != null && !req.isCancelled()) {
                return req;
            }
        }
        return null;
    }

    public ZoneMatrix getMatrix() {
        return matrix;
    }

    public DemandDistributions getDemand() {
        return demand;
    }

    public DispatchPolicy getPolicy() {
        return policy;
    }

    public int getFleetSize() {
        return fleetSize;
    }

    public double getDemandMultiplier() {
        return demandMultiplier;
    }

    private record TripAssignment(Vehicle vehicle, TripRequest request) {}
    private record RepositionAssignment(Vehicle vehicle, int targetZoneId) {}
}
