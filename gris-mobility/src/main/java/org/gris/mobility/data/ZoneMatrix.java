package org.gris.mobility.data;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Encapsulates travel times and distances between NYC taxi zones.
 * Derived from empirical TLC trip records and zone centroid geometries.
 */
public class ZoneMatrix {
    private final Map<Integer, TaxiZone> zones;
    private final Map<Long, Double> travelTimeOverrides = new ConcurrentHashMap<>();

    // Average NYC urban speeds (km/h)
    private static final double MANHATTAN_AVG_SPEED_KMH = 14.0;
    private static final double OUTER_BOROUGH_AVG_SPEED_KMH = 24.0;
    private static final double AIRPORT_HIGHWAY_SPEED_KMH = 38.0;

    public ZoneMatrix(Map<Integer, TaxiZone> zones) {
        this.zones = Map.copyOf(zones);
    }

    public TaxiZone getZone(int zoneId) {
        return zones.get(zoneId);
    }

    public Map<Integer, TaxiZone> getAllZones() {
        return zones;
    }

    public void setTravelTimeOverride(int originId, int destId, double durationSeconds) {
        travelTimeOverrides.put(key(originId, destId), durationSeconds);
    }

    /**
     * Computes the estimated travel time in seconds between two zones.
     *
     * @param originId origin taxi zone ID
     * @param destId   destination taxi zone ID
     * @return duration in seconds (minimum 120s for intra-zone)
     */
    public double getTravelTimeSeconds(int originId, int destId) {
        Long pairKey = key(originId, destId);
        Double override = travelTimeOverrides.get(pairKey);
        if (override != null) {
            return override;
        }

        TaxiZone origin = zones.get(originId);
        TaxiZone dest = zones.get(destId);

        if (origin == null || dest == null) {
            return 600.0; // fallback default: 10 minutes
        }

        if (originId == destId) {
            // Intra-zone travel: localized traffic and lights
            return "Manhattan".equalsIgnoreCase(origin.borough()) ? 240.0 : 180.0;
        }

        double distanceKm = origin.distanceKmTo(dest);
        double speedKmh = getEffectiveSpeed(origin, dest);

        // Add 60s for intersection / dispatch overhead
        double travelSeconds = (distanceKm / speedKmh) * 3600.0 + 60.0;
        return Math.max(120.0, travelSeconds);
    }

    public double getDistanceKm(int originId, int destId) {
        TaxiZone origin = zones.get(originId);
        TaxiZone dest = zones.get(destId);
        if (origin == null || dest == null || originId == destId) {
            return 1.2; // average intra-zone distance
        }
        return origin.distanceKmTo(dest);
    }

    private double getEffectiveSpeed(TaxiZone origin, TaxiZone dest) {
        boolean isAirport = origin.name().contains("Airport") || dest.name().contains("Airport");
        if (isAirport) {
            return AIRPORT_HIGHWAY_SPEED_KMH;
        }
        boolean bothManhattan = "Manhattan".equalsIgnoreCase(origin.borough()) &&
                "Manhattan".equalsIgnoreCase(dest.borough());
        if (bothManhattan) {
            return MANHATTAN_AVG_SPEED_KMH;
        }
        return OUTER_BOROUGH_AVG_SPEED_KMH;
    }

    private static long key(int origin, int dest) {
        return (((long) origin) << 32) | (dest & 0xFFFFFFFFL);
    }
}
