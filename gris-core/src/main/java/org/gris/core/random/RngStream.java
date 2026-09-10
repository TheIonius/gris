package org.gris.core.random;

import java.util.List;
import java.util.Objects;
import java.util.random.RandomGenerator;

/**
 * Represents an isolated pseudo-random number generator stream.
 * Encapsulates standard continuous and discrete probability distributions.
 */
public class RngStream {
    private final String name;
    private final long seed;
    private final RandomGenerator generator;

    public RngStream(String name, long seed, RandomGenerator generator) {
        this.name = Objects.requireNonNull(name, "Stream name cannot be null");
        this.seed = seed;
        this.generator = Objects.requireNonNull(generator, "Generator cannot be null");
    }

    public String getName() {
        return name;
    }

    public long getSeed() {
        return seed;
    }

    /**
     * @return uniform double in [0.0, 1.0)
     */
    public double nextDouble() {
        return generator.nextDouble();
    }

    /**
     * @return uniform double in [min, max)
     */
    public double uniform(double min, double max) {
        if (max <= min) {
            throw new IllegalArgumentException("max must be greater than min: [" + min + ", " + max + "]");
        }
        return min + (max - min) * generator.nextDouble();
    }

    /**
     * @return integer in [0, bound)
     */
    public int nextInt(int bound) {
        return generator.nextInt(bound);
    }

    public long nextLong() {
        return generator.nextLong();
    }

    public boolean nextBoolean() {
        return generator.nextBoolean();
    }

    /**
     * Exponential distribution with rate lambda (mean = 1/lambda).
     * Uses inverse transform sampling: -ln(1 - U) / lambda.
     *
     * @param rate arrival/service rate lambda (must be > 0)
     * @return sampled time duration
     */
    public double exponential(double rate) {
        if (rate <= 0.0) {
            throw new IllegalArgumentException("Exponential rate must be strictly positive, got: " + rate);
        }
        // generator.nextDouble() is in [0, 1). To avoid ln(0), use (1.0 - U) or nextDouble() strictly > 0
        double u = generator.nextDouble();
        while (u == 0.0) {
            u = generator.nextDouble();
        }
        return -Math.log(u) / rate;
    }

    /**
     * Normal (Gaussian) distribution with given mean and standard deviation.
     */
    public double normal(double mean, double stdDev) {
        if (stdDev < 0.0) {
            throw new IllegalArgumentException("Standard deviation cannot be negative: " + stdDev);
        }
        return mean + stdDev * generator.nextGaussian();
    }

    /**
     * Triangular distribution between low and high with peak at mode.
     */
    public double triangular(double low, double mode, double high) {
        if (low > mode || mode > high || low == high) {
            throw new IllegalArgumentException(
                    String.format("Invalid triangular parameters: low=%f, mode=%f, high=%f", low, mode, high));
        }
        double u = generator.nextDouble();
        double f = (mode - low) / (high - low);
        if (u <= f) {
            return low + Math.sqrt(u * (high - low) * (mode - low));
        } else {
            return high - Math.sqrt((1.0 - u) * (high - low) * (high - mode));
        }
    }

    /**
     * Samples an index according to an array of relative non-negative weights.
     */
    public int sampleDiscrete(double[] weights) {
        if (weights == null || weights.length == 0) {
            throw new IllegalArgumentException("Weights array cannot be empty");
        }
        double sum = 0.0;
        for (double w : weights) {
            if (w < 0.0) {
                throw new IllegalArgumentException("Weights must be non-negative");
            }
            sum += w;
        }
        if (sum <= 0.0) {
            throw new IllegalArgumentException("Sum of weights must be positive");
        }
        double r = generator.nextDouble() * sum;
        double cumulative = 0.0;
        for (int i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (r < cumulative) {
                return i;
            }
        }
        return weights.length - 1;
    }

    /**
     * Samples an item from a list given corresponding non-negative weights.
     */
    public <T> T sampleChoice(List<T> items, double[] weights) {
        if (items.size() != weights.length) {
            throw new IllegalArgumentException("Items and weights must have identical length");
        }
        int index = sampleDiscrete(weights);
        return items.get(index);
    }
}
