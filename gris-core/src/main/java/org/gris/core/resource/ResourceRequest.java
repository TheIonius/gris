package org.gris.core.resource;

import java.util.Objects;
import java.util.function.Consumer;

/**
 * A request for resource units submitted to a ResourcePool.
 * Ordered deterministically by priority and sequenceId.
 */
public class ResourceRequest implements Comparable<ResourceRequest> {
    private final String requestId;
    private final String entityId;
    private final int units;
    private final double requestTime;
    private final int priority;
    private final long sequenceId;
    private final Consumer<ResourceLease> onAcquired;

    public ResourceRequest(
            String requestId,
            String entityId,
            int units,
            double requestTime,
            int priority,
            long sequenceId,
            Consumer<ResourceLease> onAcquired
    ) {
        this.requestId = Objects.requireNonNull(requestId, "requestId cannot be null");
        this.entityId = Objects.requireNonNull(entityId, "entityId cannot be null");
        if (units <= 0) {
            throw new IllegalArgumentException("Requested units must be positive: " + units);
        }
        this.units = units;
        this.requestTime = requestTime;
        this.priority = priority;
        this.sequenceId = sequenceId;
        this.onAcquired = Objects.requireNonNull(onAcquired, "onAcquired callback cannot be null");
    }

    public String getRequestId() {
        return requestId;
    }

    public String getEntityId() {
        return entityId;
    }

    public int getUnits() {
        return units;
    }

    public double getRequestTime() {
        return requestTime;
    }

    public int getPriority() {
        return priority;
    }

    public long getSequenceId() {
        return sequenceId;
    }

    public void notifyAcquired(ResourceLease lease) {
        onAcquired.accept(lease);
    }

    @Override
    public int compareTo(ResourceRequest other) {
        int prioCmp = Integer.compare(this.priority, other.priority);
        if (prioCmp != 0) {
            return prioCmp;
        }
        return Long.compare(this.sequenceId, other.sequenceId);
    }

    @Override
    public String toString() {
        return String.format("ResourceRequest[id=%s, entity=%s, units=%d, prio=%d, seq=%d, reqTime=%.4f]",
                requestId, entityId, units, priority, sequenceId, requestTime);
    }
}
