package org.gris.core.engine;

/**
 * Tracks virtual simulation time as a monotonically advancing double.
 */
public class SimulationClock {
    private double currentTime;

    public SimulationClock() {
        this(0.0);
    }

    public SimulationClock(double initialTime) {
        if (initialTime < 0) {
            throw new IllegalArgumentException("Initial simulation time cannot be negative: " + initialTime);
        }
        this.currentTime = initialTime;
    }

    public double now() {
        return currentTime;
    }

    public void advanceTo(double newTime) {
        if (newTime < currentTime) {
            throw new IllegalArgumentException(String.format(
                    "Cannot move simulation clock backwards from %f to %f", currentTime, newTime));
        }
        this.currentTime = newTime;
    }

    public void reset(double initialTime) {
        if (initialTime < 0) {
            throw new IllegalArgumentException("Simulation time cannot be negative: " + initialTime);
        }
        this.currentTime = initialTime;
    }

    @Override
    public String toString() {
        return String.format("SimulationClock[t=%.4f]", currentTime);
    }
}
