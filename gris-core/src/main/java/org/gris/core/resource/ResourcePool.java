package org.gris.core.resource;

import org.gris.core.metrics.MetricsRegistry;
import org.gris.core.metrics.SampleMetric;
import org.gris.core.metrics.TimeWeightedMetric;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/**
 * Manages a pool of homogeneous resources with bounded capacity and a deterministic priority queue.
 * Automatically tracks utilization, queue length, waiting times, and holding times.
 */
public class ResourcePool {
    private final String name;
    private final int totalCapacity;
    private int availableCapacity;

    private final PriorityQueue<ResourceRequest> waitingQueue = new PriorityQueue<>();
    private final Map<String, ResourceLease> activeLeases = new ConcurrentHashMap<>();

    private final AtomicLong requestSequenceGenerator = new AtomicLong(0);
    private final AtomicLong leaseSequenceGenerator = new AtomicLong(0);

    // Metrics
    private final TimeWeightedMetric utilizationMetric;
    private final TimeWeightedMetric busyUnitsMetric;
    private final TimeWeightedMetric queueLengthMetric;
    private final SampleMetric waitTimeMetric;
    private final SampleMetric holdingTimeMetric;

    public ResourcePool(String name, int totalCapacity, double initialTime, MetricsRegistry metricsRegistry) {
        if (totalCapacity <= 0) {
            throw new IllegalArgumentException("ResourcePool capacity must be positive: " + totalCapacity);
        }
        this.name = Objects.requireNonNull(name, "ResourcePool name cannot be null");
        this.totalCapacity = totalCapacity;
        this.availableCapacity = totalCapacity;

        // Register metrics
        this.busyUnitsMetric = metricsRegistry.getOrCreateTimeWeightedMetric(
                name + ".busy_units", initialTime, 0.0);
        this.utilizationMetric = metricsRegistry.getOrCreateTimeWeightedMetric(
                name + ".utilization", initialTime, 0.0);
        this.queueLengthMetric = metricsRegistry.getOrCreateTimeWeightedMetric(
                name + ".queue_length", initialTime, 0.0);
        this.waitTimeMetric = metricsRegistry.getOrCreateSampleMetric(
                name + ".wait_time");
        this.holdingTimeMetric = metricsRegistry.getOrCreateSampleMetric(
                name + ".holding_time");
    }

    public String getName() {
        return name;
    }

    public int getTotalCapacity() {
        return totalCapacity;
    }

    public synchronized int getAvailableCapacity() {
        return availableCapacity;
    }

    public synchronized int getBusyCapacity() {
        return totalCapacity - availableCapacity;
    }

    public synchronized int getQueueLength() {
        return waitingQueue.size();
    }

    /**
     * Requests resource units for an entity.
     * If capacity is immediately available, the lease is granted synchronously and onAcquired is invoked.
     * Otherwise, the request is placed into the deterministic waiting queue.
     *
     * @return optional ResourceLease if granted immediately, empty if queued
     */
    public synchronized Optional<ResourceLease> request(
            String entityId,
            int units,
            int priority,
            double currentTime,
            Consumer<ResourceLease> onAcquired
    ) {
        if (units > totalCapacity) {
            throw new IllegalArgumentException(String.format(
                    "Requested %d units but pool '%s' total capacity is only %d", units, name, totalCapacity));
        }

        if (waitingQueue.isEmpty() && units <= availableCapacity) {
            ResourceLease lease = grantLease(entityId, units, currentTime);
            waitTimeMetric.record(0.0);
            onAcquired.accept(lease);
            return Optional.of(lease);
        }

        // Queue request
        long seq = requestSequenceGenerator.incrementAndGet();
        String reqId = String.format("req-%s-%d", name, seq);
        ResourceRequest request = new ResourceRequest(reqId, entityId, units, currentTime, priority, seq, onAcquired);
        waitingQueue.add(request);
        queueLengthMetric.update(currentTime, waitingQueue.size());

        return Optional.empty();
    }

    /**
     * Releases an active lease and satisfies any pending queued requests if capacity permits.
     */
    public synchronized void release(ResourceLease lease, double currentTime) {
        Objects.requireNonNull(lease, "Cannot release null lease");
        if (activeLeases.remove(lease.getLeaseId()) == null) {
            throw new IllegalStateException("Lease not found or already released: " + lease.getLeaseId());
        }

        availableCapacity += lease.getUnits();
        double holdingDuration = currentTime - lease.getAcquisitionTime();
        holdingTimeMetric.record(holdingDuration);

        updateUtilizationMetrics(currentTime);

        // Process queue FIFO/Priority
        processQueue(currentTime);
    }

    private void processQueue(double currentTime) {
        List<ResourceRequest> postponed = new ArrayList<>();

        while (!waitingQueue.isEmpty()) {
            ResourceRequest next = waitingQueue.peek();
            if (next.getUnits() <= availableCapacity) {
                waitingQueue.poll();
                ResourceLease granted = grantLease(next.getEntityId(), next.getUnits(), currentTime);
                double waitTime = currentTime - next.getRequestTime();
                waitTimeMetric.record(waitTime);
                next.notifyAcquired(granted);
            } else {
                // If head request cannot fit, we stop (strict FIFO head-of-line) or preserve order
                break;
            }
        }

        queueLengthMetric.update(currentTime, waitingQueue.size());
    }

    private ResourceLease grantLease(String entityId, int units, double currentTime) {
        availableCapacity -= units;
        long leaseNum = leaseSequenceGenerator.incrementAndGet();
        String leaseId = String.format("lease-%s-%d", name, leaseNum);
        ResourceLease lease = new ResourceLease(leaseId, name, entityId, units, currentTime);
        activeLeases.put(leaseId, lease);
        updateUtilizationMetrics(currentTime);
        return lease;
    }

    private void updateUtilizationMetrics(double currentTime) {
        int busy = totalCapacity - availableCapacity;
        busyUnitsMetric.update(currentTime, busy);
        utilizationMetric.update(currentTime, (double) busy / totalCapacity);
    }

    public TimeWeightedMetric getUtilizationMetric() {
        return utilizationMetric;
    }

    public TimeWeightedMetric getBusyUnitsMetric() {
        return busyUnitsMetric;
    }

    public TimeWeightedMetric getQueueLengthMetric() {
        return queueLengthMetric;
    }

    public SampleMetric getWaitTimeMetric() {
        return waitTimeMetric;
    }

    public SampleMetric getHoldingTimeMetric() {
        return holdingTimeMetric;
    }
}
