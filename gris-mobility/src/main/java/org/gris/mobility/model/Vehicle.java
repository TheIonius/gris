package org.gris.mobility.model;

/**
 * Represents a vehicle resource within the urban mobility fleet.
 */
public class Vehicle {
    private final String id;
    private int currentZoneId;
    private VehicleStatus status;
    private double availableAtTime;
    private long completedTrips;
    private double totalOccupiedSeconds;
    private double totalEmptySeconds;

    public Vehicle(String id, int initialZoneId) {
        this.id = id;
        this.currentZoneId = initialZoneId;
        this.status = VehicleStatus.IDLE;
        this.availableAtTime = 0.0;
        this.completedTrips = 0;
    }

    public String getId() {
        return id;
    }

    public int getCurrentZoneId() {
        return currentZoneId;
    }

    public void setCurrentZoneId(int currentZoneId) {
        this.currentZoneId = currentZoneId;
    }

    public VehicleStatus getStatus() {
        return status;
    }

    public void setStatus(VehicleStatus status) {
        this.status = status;
    }

    public double getAvailableAtTime() {
        return availableAtTime;
    }

    public void setAvailableAtTime(double availableAtTime) {
        this.availableAtTime = availableAtTime;
    }

    public boolean isIdle() {
        return status == VehicleStatus.IDLE;
    }

    public void recordCompletedTrip(double occupiedSeconds) {
        this.completedTrips++;
        this.totalOccupiedSeconds += occupiedSeconds;
    }

    public void recordEmptyTravel(double emptySeconds) {
        this.totalEmptySeconds += emptySeconds;
    }

    public long getCompletedTrips() {
        return completedTrips;
    }

    public double getTotalOccupiedSeconds() {
        return totalOccupiedSeconds;
    }

    public double getTotalEmptySeconds() {
        return totalEmptySeconds;
    }
}
