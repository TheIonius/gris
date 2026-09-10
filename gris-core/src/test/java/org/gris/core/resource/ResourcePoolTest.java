package org.gris.core.resource;

import org.gris.core.metrics.MetricsRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class ResourcePoolTest {

    private MetricsRegistry metrics;
    private ResourcePool pool;

    @BeforeEach
    void setUp() {
        metrics = new MetricsRegistry();
        pool = new ResourcePool("servers", 2, 0.0, metrics);
    }

    @Test
    @DisplayName("Immediately grants lease when capacity is available")
    void testImmediateGrant() {
        AtomicReference<ResourceLease> acquired = new AtomicReference<>();
        Optional<ResourceLease> lease = pool.request("cust-1", 1, 0, 10.0, acquired::set);

        assertThat(lease).isPresent();
        assertThat(acquired.get()).isNotNull();
        assertThat(pool.getAvailableCapacity()).isEqualTo(1);
        assertThat(pool.getBusyCapacity()).isEqualTo(1);
        assertThat(pool.getQueueLength()).isEqualTo(0);
    }

    @Test
    @DisplayName("Queues requests when capacity is exhausted and satisfies them upon release")
    void testQueueingAndRelease() {
        List<ResourceLease> activeLeases = new ArrayList<>();
        pool.request("cust-1", 1, 0, 1.0, activeLeases::add);
        pool.request("cust-2", 1, 0, 2.0, activeLeases::add);

        assertThat(activeLeases).hasSize(2);
        assertThat(pool.getAvailableCapacity()).isEqualTo(0);

        // Third request must be queued
        AtomicReference<ResourceLease> queuedGrant = new AtomicReference<>();
        Optional<ResourceLease> queuedResult = pool.request("cust-3", 1, 0, 3.0, queuedGrant::set);

        assertThat(queuedResult).isEmpty();
        assertThat(queuedGrant.get()).isNull();
        assertThat(pool.getQueueLength()).isEqualTo(1);

        // Release first lease at t=5.0
        pool.release(activeLeases.get(0), 5.0);

        // cust-3 should now be immediately granted!
        assertThat(queuedGrant.get()).isNotNull();
        assertThat(queuedGrant.get().getEntityId()).isEqualTo("cust-3");
        assertThat(pool.getQueueLength()).isEqualTo(0);
        assertThat(pool.getAvailableCapacity()).isEqualTo(0);

        // Wait time for cust-3: requested at t=3.0, granted at t=5.0 -> wait = 2.0
        assertThat(pool.getWaitTimeMetric().getCount()).isEqualTo(3); // 2 immediate (0.0 wait) + 1 queued (2.0 wait)
        assertThat(pool.getWaitTimeMetric().getMax()).isEqualTo(2.0);
    }
}
