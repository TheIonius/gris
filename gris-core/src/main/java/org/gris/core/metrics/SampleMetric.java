package org.gris.core.metrics;

/**
 * Accumulates statistics for sample-based (discrete-event) observations
 * such as waiting time, transit time, or delay.
 * <p>
 * Uses Welford's algorithm for numerically stable running variance.
 */
public class SampleMetric {
    private final String name;
    private long count;
    private double sum;
    private double min = Double.POSITIVE_INFINITY;
    private double max = Double.NEGATIVE_INFINITY;
    private double mean;
    private double m2; // Sum of squares of differences from current mean

    public SampleMetric(String name) {
        this.name = name;
    }

    public synchronized void record(double value) {
        count++;
        sum += value;
        if (value < min) {
            min = value;
        }
        if (value > max) {
            max = value;
        }

        // Welford's update
        double delta = value - mean;
        mean += delta / count;
        double delta2 = value - mean;
        m2 += delta * delta2;
    }

    public String getName() {
        return name;
    }

    public synchronized long getCount() {
        return count;
    }

    public synchronized double getSum() {
        return sum;
    }

    public synchronized double getMean() {
        return count == 0 ? 0.0 : mean;
    }

    public synchronized double getMin() {
        return count == 0 ? 0.0 : min;
    }

    public synchronized double getMax() {
        return count == 0 ? 0.0 : max;
    }

    public synchronized double getVariance() {
        return count > 1 ? m2 / (count - 1) : 0.0;
    }

    public synchronized double getStandardDeviation() {
        return Math.sqrt(getVariance());
    }

    public synchronized double getStandardError() {
        return count > 0 ? getStandardDeviation() / Math.sqrt(count) : 0.0;
    }

    /**
     * Approximate 95% confidence interval half-width (z = 1.96).
     */
    public synchronized double getConfidenceInterval95() {
        return 1.95996 * getStandardError();
    }

    public synchronized void reset() {
        count = 0;
        sum = 0.0;
        min = Double.POSITIVE_INFINITY;
        max = Double.NEGATIVE_INFINITY;
        mean = 0.0;
        m2 = 0.0;
    }

    @Override
    public synchronized String toString() {
        return String.format("%s[N=%d, mean=%.4f +/- %.4f (95%% CI), min=%.4f, max=%.4f, std=%.4f]",
                name, count, getMean(), getConfidenceInterval95(), getMin(), getMax(), getStandardDeviation());
    }
}
