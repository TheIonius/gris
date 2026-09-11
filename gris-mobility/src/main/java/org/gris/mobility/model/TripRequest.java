package org.gris.mobility.model;

/**
 * Represents a passenger trip request arriving into the simulation.
 */
public class TripRequest {
    private final String id;
    private final int originZoneId;
    private final int destinationZoneId;
    private final double requestTime;
    private final double maxWaitTolerance;

    private String assignedVehicleId;
    private double pickupTime = -1.0;
    private double dropoffTime = -1.0;
    private boolean cancelled = false;

    public TripRequest(String id, int originZoneId, int destinationZoneId, double requestTime, double maxWaitTolerance) {
        this.id = id;
        this.originZoneId = originZoneId;
        this.destinationZoneId = destinationZoneId;
        this.requestTime = requestTime;
        this.maxWaitTolerance = maxWaitTolerance;
    }

    public String getId() {
        return id;
    }

    public int getOriginZoneId() {
        return originZoneId;
    }

    public int getDestinationZoneId() {
        return destinationZoneId;
    }

    public double getRequestTime() {
        return requestTime;
    }

    public double getMaxWaitTolerance() {
        return maxWaitTolerance;
    }

    public String getAssignedVehicleId() {
        return assignedVehicleId;
    }

    public void setAssignedVehicleId(String assignedVehicleId) {
        this.assignedVehicleId = assignedVehicleId;
    }

    public double getPickupTime() {
        return pickupTime;
    }

    public void setPickupTime(double pickupTime) {
        this.pickupTime = pickupTime;
    }

    public double getDropoffTime() {
        return dropoffTime;
    }

    public void setDropoffTime(double dropoffTime) {
        this.dropoffTime = dropoffTime;
    }

    public boolean isCancelled() {
        return cancelled;
    }

    public void setCancelled(boolean cancelled) {
        this.cancelled = cancelled;
    }

    public double getWaitTime() {
        return pickupTime >= requestTime ? pickupTime - requestTime : -1.0;
    }

    public double getTripDuration() {
        return dropoffTime >= pickupTime ? dropoffTime - pickupTime : -1.0;
    }
}
