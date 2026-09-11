package org.gris.terminal.model;

/**
 * Represents a container cargo vessel arriving at the DP World Caucedo terminal.
 */
public class Vessel {
    private final String id;
    private final String vesselClass;
    private final int containerMoves;
    private final double arrivalTime;

    private double berthingTime = -1.0;
    private double operationsStartTime = -1.0;
    private double departureTime = -1.0;
    private int assignedCranes = 0;

    public Vessel(String id, String vesselClass, int containerMoves, double arrivalTime) {
        this.id = id;
        this.vesselClass = vesselClass;
        this.containerMoves = containerMoves;
        this.arrivalTime = arrivalTime;
    }

    public String getId() {
        return id;
    }

    public String getVesselClass() {
        return vesselClass;
    }

    public int getContainerMoves() {
        return containerMoves;
    }

    public double getArrivalTime() {
        return arrivalTime;
    }

    public double getBerthingTime() {
        return berthingTime;
    }

    public void setBerthingTime(double berthingTime) {
        this.berthingTime = berthingTime;
    }

    public double getOperationsStartTime() {
        return operationsStartTime;
    }

    public void setOperationsStartTime(double operationsStartTime) {
        this.operationsStartTime = operationsStartTime;
    }

    public double getDepartureTime() {
        return departureTime;
    }

    public void setDepartureTime(double departureTime) {
        this.departureTime = departureTime;
    }

    public int getAssignedCranes() {
        return assignedCranes;
    }

    public void setAssignedCranes(int assignedCranes) {
        this.assignedCranes = assignedCranes;
    }

    public double getTurnaroundTime() {
        return departureTime >= arrivalTime ? departureTime - arrivalTime : -1.0;
    }

    public double getBerthWaitTime() {
        return berthingTime >= arrivalTime ? berthingTime - arrivalTime : -1.0;
    }
}
