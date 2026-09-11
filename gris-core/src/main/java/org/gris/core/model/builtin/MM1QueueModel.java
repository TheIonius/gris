package org.gris.core.model.builtin;

import org.gris.core.model.Entity;
import org.gris.core.model.Event;
import org.gris.core.model.SimulationContext;
import org.gris.core.model.SimulationModel;
import org.gris.core.random.RngStream;
import org.gris.core.resource.ResourceLease;
import org.gris.core.resource.ResourcePool;

/**
 * Standard M/M/1 (or M/M/c) queueing model.
 * Used for analytical validation, testing, and baseline verification.
 */
public class MM1QueueModel implements SimulationModel {
    private final double lambda;
    private final double mu;
    private final double warmupTime;
    private final int servers;

    private ResourcePool serverPool;
    private RngStream arrivalStream;
    private RngStream serviceStream;
    private long customerCounter = 0;

    public MM1QueueModel(double lambda, double mu, double warmupTime) {
        this(lambda, mu, warmupTime, 1);
    }

    public MM1QueueModel(double lambda, double mu, double warmupTime, int servers) {
        if (lambda <= 0) throw new IllegalArgumentException("Arrival rate lambda must be positive");
        if (mu <= 0) throw new IllegalArgumentException("Service rate mu must be positive");
        if (warmupTime < 0) throw new IllegalArgumentException("Warmup time cannot be negative");
        if (servers < 1) throw new IllegalArgumentException("Servers count must be >= 1");

        this.lambda = lambda;
        this.mu = mu;
        this.warmupTime = warmupTime;
        this.servers = servers;
    }

    @Override
    public String name() {
        return "MM1QueueModel";
    }

    @Override
    public void init(SimulationContext ctx) {
        this.serverPool = ctx.registerResourcePool("server", servers);
        this.arrivalStream = ctx.getRngStream("arrivals");
        this.serviceStream = ctx.getRngStream("service");
        this.customerCounter = 0;

        // Schedule initial arrival
        double firstArrivalDelay = arrivalStream.exponential(lambda);
        ctx.scheduleAfter(firstArrivalDelay, "ARRIVAL", null);
    }

    @Override
    public void onEvent(Event event, SimulationContext ctx) {
        switch (event.type()) {
            case "ARRIVAL" -> handleArrival(ctx);
            case "DEPARTURE" -> handleDeparture(event, ctx);
            default -> throw new IllegalArgumentException("Unknown event type: " + event.type());
        }
    }

    private void handleArrival(SimulationContext ctx) {
        ctx.metrics().incrementCounter("customers.arrived");

        // Schedule subsequent arrival
        double nextArrivalDelay = arrivalStream.exponential(lambda);
        ctx.scheduleAfter(nextArrivalDelay, "ARRIVAL", null);

        String customerId = "customer-" + (++customerCounter);
        Entity customer = new Entity(customerId, "CUSTOMER", ctx.now());
        double requestTime = ctx.now();

        serverPool.request(customer.getId(), 1, 0, ctx.now(), lease -> {
            double waitTime = ctx.now() - requestTime;
            if (ctx.now() >= warmupTime) {
                ctx.metrics().getOrCreateSampleMetric("steady.customer.queue_wait").record(waitTime);
            }

            double serviceDuration = serviceStream.exponential(mu);
            DepartureRecord record = new DepartureRecord(customer, lease, requestTime);
            ctx.scheduleAfter(serviceDuration, "DEPARTURE", record);
        });
    }

    private void handleDeparture(Event event, SimulationContext ctx) {
        DepartureRecord record = (DepartureRecord) event.payload();
        ctx.metrics().incrementCounter("customers.served");

        double totalTimeInSystem = ctx.now() - record.customer().getCreationTime();
        if (record.customer().getCreationTime() >= warmupTime) {
            ctx.metrics().getOrCreateSampleMetric("steady.customer.system_time").record(totalTimeInSystem);
        }

        serverPool.release(record.lease(), ctx.now());
    }

    public double getLambda() {
        return lambda;
    }

    public double getMu() {
        return mu;
    }

    public double getWarmupTime() {
        return warmupTime;
    }

    public int getServers() {
        return servers;
    }

    private record DepartureRecord(Entity customer, ResourceLease lease, double queueEntryTime) {
    }
}
