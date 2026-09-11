package org.gris.mobility.data;

import java.util.*;

/**
 * Encapsulates empirical demand distributions derived from NYC TLC trip records:
 * - Hourly arrival rate per zone: lambda(zone, hour)
 * - Origin-Destination transition matrix: P(dest | origin)
 */
public class DemandDistributions {

    // zoneId -> array of 24 hourly rates (arrivals per hour)
    private final Map<Integer, double[]> hourlyArrivalRates;

    // originZoneId -> cumulative destination probabilities (zoneId -> cumulative prob up to 1.0)
    private final Map<Integer, int[]> destinationZoneIds;
    private final Map<Integer, double[]> destinationCdfs;

    public DemandDistributions(
            Map<Integer, double[]> hourlyArrivalRates,
            Map<Integer, Map<Integer, Double>> transitionProbabilities
    ) {
        this.hourlyArrivalRates = Map.copyOf(hourlyArrivalRates);

        Map<Integer, int[]> destIdsMap = new HashMap<>();
        Map<Integer, double[]> destCdfMap = new HashMap<>();

        for (var entry : transitionProbabilities.entrySet()) {
            int origin = entry.getKey();
            Map<Integer, Double> destProbs = entry.getValue();

            int count = destProbs.size();
            int[] ids = new int[count];
            double[] cdf = new double[count];

            double cum = 0.0;
            int idx = 0;
            for (var destEntry : destProbs.entrySet()) {
                ids[idx] = destEntry.getKey();
                cum += destEntry.getValue();
                cdf[idx] = cum;
                idx++;
            }

            // Normalize in case probabilities don't sum to exactly 1.0
            if (cum > 0 && Math.abs(cum - 1.0) > 1e-6) {
                for (int i = 0; i < count; i++) {
                    cdf[i] /= cum;
                }
            }
            cdf[count - 1] = 1.0; // clamp end to 1.0

            destIdsMap.put(origin, ids);
            destCdfMap.put(origin, cdf);
        }

        this.destinationZoneIds = Map.copyOf(destIdsMap);
        this.destinationCdfs = Map.copyOf(destCdfMap);
    }

    /**
     * Gets the arrival rate in trips per second for a given zone at virtual simulation time.
     *
     * @param zoneId          taxi zone ID
     * @param simulationTimeS virtual simulation time in seconds
     * @return arrival rate lambda in requests/second
     */
    public double getArrivalRatePerSecond(int zoneId, double simulationTimeS, double multiplier) {
        double[] rates = hourlyArrivalRates.get(zoneId);
        if (rates == null || rates.length == 0) {
            return 0.001 * multiplier; // minimal baseline
        }

        // Calculate hour of day (0-23)
        int hourOfDay = ((int) (simulationTimeS / 3600.0)) % 24;
        double hourlyRate = rates[hourOfDay] * multiplier;

        // Convert trips/hour to trips/second
        return hourlyRate / 3600.0;
    }

    /**
     * Samples a destination zone from the origin zone's transition distribution using a uniform draw u in [0, 1).
     */
    public int sampleDestinationZone(int originZoneId, double uniformDraw) {
        int[] ids = destinationZoneIds.get(originZoneId);
        double[] cdf = destinationCdfs.get(originZoneId);

        if (ids == null || ids.length == 0) {
            return originZoneId; // fallback
        }

        int index = Arrays.binarySearch(cdf, uniformDraw);
        if (index < 0) {
            index = -index - 1;
        }
        if (index >= ids.length) {
            index = ids.length - 1;
        }
        return ids[index];
    }

    public Set<Integer> getActiveZones() {
        return hourlyArrivalRates.keySet();
    }
}
