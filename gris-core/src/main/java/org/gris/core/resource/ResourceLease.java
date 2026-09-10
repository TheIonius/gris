package org.gris.core.resource;

import java.util.Objects;

/**
 * Handle representing an active allocation of resource units from a ResourcePool.
 */
public class ResourceLease {
    private final String leaseId;
    private final String poolName;
    private final String entityId;
    private final int units;
    private final double acquisitionTime;

    public ResourceLease(String leaseId, String poolName, String entityId, int units, double acquisitionTime) {
        this.leaseId = Objects.requireNonNull(leaseId, "leaseId cannot be null");
        this.poolName = Objects.requireNonNull(poolName, "poolName cannot be null");
        this.entityId = Objects.requireNonNull(entityId, "entityId cannot be null");
        this.units = units;
        this.acquisitionTime = acquisitionTime;
    }

    public String getLeaseId() {
        return leaseId;
    }

    public String getPoolName() {
        return poolName;
    }

    public String getEntityId() {
        return entityId;
    }

    public int getUnits() {
        return units;
    }

    public double getAcquisitionTime() {
        return acquisitionTime;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ResourceLease that)) return false;
        return leaseId.equals(that.leaseId);
    }

    @Override
    public int hashCode() {
        return leaseId.hashCode();
    }

    @Override
    public String toString() {
        return String.format("ResourceLease[id=%s, pool=%s, entity=%s, units=%d, acquiredAt=%.4f]",
                leaseId, poolName, entityId, units, acquisitionTime);
    }
}
