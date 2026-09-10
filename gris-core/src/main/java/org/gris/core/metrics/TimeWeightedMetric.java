package org.gris.core.metrics;

/**
 * Accumulates time-weighted statistics for continuous state variables
 * (e.g. queue length, number of busy resources, utilization).
 * <p>
 * Given states X(t) in intervals [t_i, t_{i+1}), computes:
 * Time-average = (1 / totalTime) * sum(X(t_i) * (t_{i+1} - t_i))
 */
public class TimeWeightedMetric {
    private final String name;
    private double lastUpdateTime;
    private double currentValue;
    private double totalArea;
    private double startTime;
    private double min = Double.POSITIVE_INFINITY;
    private double max = Double.NEGATIVE_INFINITY;
    private boolean initialized = false;

    public TimeWeightedMetric(String name, double initialTime, double initialValue) {
        this.name = name;
        reset(initialTime, initialValue);
    }

    public synchronized void update(double currentTime, double newValue) {
        if (currentTime < lastUpdateTime) {
            throw new IllegalArgumentException(String.format(
                    "Cannot update TimeWeightedMetric with past time: currentTime=%f, lastUpdateTime=%f",
                    currentTime, lastUpdateTime));
        }

        double dt = currentTime - lastUpdateTime;
        if (dt > 0.0) {
            totalArea += currentValue * dt;
        }

        lastUpdateTime = currentTime;
        currentValue = newValue;

        if (newValue < min) {
            min = newValue;
        }
        if (newValue > max) {
            max = newValue;
        }
    }

    public synchronized void advanceTo(double currentTime) {
        if (currentTime < lastUpdateTime) {
            throw new IllegalArgumentException(String.format(
                    "Cannot advance TimeWeightedMetric to past time: currentTime=%f, lastUpdateTime=%f",
                    currentTime, lastUpdateTime));
        }
        double dt = currentTime - lastUpdateTime;
        if (dt > 0.0) {
            totalArea += currentValue * dt;
            lastUpdateTime = currentTime;
        }
    }

    public synchronized double getAverage(double currentTime) {
        double currentTotalArea = totalArea;
        double dt = currentTime - lastUpdateTime;
        if (dt > 0.0) {
            currentTotalArea += currentValue * dt;
        }
        double totalDuration = currentTime - startTime;
        if (totalDuration <= 0.0) {
            return currentValue;
        }
        return currentTotalArea / totalDuration;
    }

    public synchronized double getCurrentValue() {
        return currentValue;
    }

    public synchronized double getMin() {
        return initialized ? min : 0.0;
    }

    public synchronized double getMax() {
        return initialized ? max : 0.0;
    }

    public String getName() {
        return name;
    }

    public synchronized void reset(double initialTime, double initialValue) {
        this.startTime = initialTime;
        this.lastUpdateTime = initialTime;
        this.currentValue = initialValue;
        this.totalArea = 0.0;
        this.min = initialValue;
        this.max = initialValue;
        this.initialized = true;
    }

    @Override
    public synchronized String toString() {
        return String.format("%s[current=%.2f, min=%.2f, max=%.2f, area=%.4f]",
                name, currentValue, min, max, totalArea);
    }
}
