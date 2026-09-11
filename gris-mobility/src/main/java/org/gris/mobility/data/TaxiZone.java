package org.gris.mobility.data;

/**
 * Represents an NYC Taxi & Limousine Commission (TLC) taxi zone.
 */
public record TaxiZone(
        int id,
        String name,
        String borough,
        double latitude,
        double longitude
) {
    /**
     * Calculates the great-circle distance in kilometers to another zone using the Haversine formula.
     */
    public double distanceKmTo(TaxiZone other) {
        double earthRadius = 6371.0; // km
        double dLat = Math.toRadians(other.latitude - this.latitude);
        double dLon = Math.toRadians(other.longitude - this.longitude);

        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
                Math.cos(Math.toRadians(this.latitude)) * Math.cos(Math.toRadians(other.latitude)) *
                        Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);

        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return earthRadius * c;
    }
}
