package org.gris.core.random;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.random.RandomGenerator;
import java.util.random.RandomGeneratorFactory;

/**
 * Manages named, independent pseudorandom number generator streams.
 * <p>
 * Ensures that changes to one process (e.g. varying fleet size or service parameters)
 * do not alter the sequence of random numbers drawn by another process (e.g. arrival times).
 */
public class RngManager {
    private final long masterSeed;
    private final String algorithm;
    private final Map<String, RngStream> streams = new ConcurrentHashMap<>();

    public RngManager(long masterSeed) {
        this(masterSeed, "L64X128MixRandom");
    }

    public RngManager(long masterSeed, String algorithm) {
        this.masterSeed = masterSeed;
        this.algorithm = Objects.requireNonNull(algorithm, "Algorithm cannot be null");
    }

    public long getMasterSeed() {
        return masterSeed;
    }

    /**
     * Retrieves or lazily creates a named RngStream.
     * The seed for the stream is derived deterministically from the master seed and the stream name.
     */
    public RngStream getStream(String streamName) {
        Objects.requireNonNull(streamName, "Stream name cannot be null");
        return streams.computeIfAbsent(streamName, name -> {
            long derivedSeed = deriveStreamSeed(masterSeed, name);
            RandomGenerator generator = createGenerator(algorithm, derivedSeed);
            return new RngStream(name, derivedSeed, generator);
        });
    }

    /**
     * Resets all streams back to their initial state for this master seed.
     */
    public void reset() {
        streams.clear();
    }

    private static RandomGenerator createGenerator(String algorithm, long seed) {
        try {
            RandomGeneratorFactory<RandomGenerator> factory = RandomGeneratorFactory.of(algorithm);
            return factory.create(seed);
        } catch (IllegalArgumentException e) {
            try {
                return RandomGenerator.getDefault();
            } catch (Exception ex) {
                // Fallback to SplittableRandom from java.base if jdk.random module is absent
                return new java.util.SplittableRandom(seed);
            }
        }
    }

    /**
     * Deterministically derives a 64-bit seed from a master seed and a string identifier
     * using FNV-1a 64-bit hash and SplitMix64 finalizer.
     */
    public static long deriveStreamSeed(long masterSeed, String streamName) {
        long fnv = 0xcbf29ce484222325L;
        for (int i = 0; i < streamName.length(); i++) {
            fnv ^= streamName.charAt(i);
            fnv *= 0x100000001b3L;
        }
        long combined = masterSeed ^ fnv;
        // SplitMix64 mixing steps
        combined = (combined ^ (combined >>> 30)) * 0xbf58476d1ce4e5b9L;
        combined = (combined ^ (combined >>> 27)) * 0x94d049bb133111ebL;
        return combined ^ (combined >>> 31);
    }
}
