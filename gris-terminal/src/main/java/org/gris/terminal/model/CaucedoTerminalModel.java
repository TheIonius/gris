package org.gris.terminal.model;

import org.gris.core.model.Event;
import org.gris.core.model.SimulationContext;
import org.gris.core.model.SimulationModel;
import org.gris.core.random.RngStream;
import org.gris.core.resource.ResourceLease;
import org.gris.core.resource.ResourcePool;

/**
 * Container terminal operations model for deep-sea vessels, berth allocation,
 * and quay crane scheduling.
 */
public class CaucedoTerminalModel implements SimulationModel {

    private final int berths;
    private final int quayCranes;
    private final double movesPerHourPerCrane;
    private final String cranePolicy; // "STATIC" or "DYNAMIC"
    private final double arrivalRatePerDay;

    private ResourcePool berthPool;
    private ResourcePool cranePool;
    private RngStream arrivalStream;
    private RngStream vesselTypeStream;
    private RngStream operationStream;
    private long vesselCounter = 0;

    public CaucedoTerminalModel(
            int berths,
            int quayCranes,
            double movesPerHourPerCrane,
            String cranePolicy,
            double arrivalRatePerDay
    ) {
        this.berths = berths;
        this.quayCranes = quayCranes;
        this.movesPerHourPerCrane = movesPerHourPerCrane;
        this.cranePolicy = cranePolicy;
        this.arrivalRatePerDay = arrivalRatePerDay;
    }

    @Override
    public String name() {
        return "CaucedoTerminal-" + cranePolicy;
    }

    @Override
    public void init(SimulationContext ctx) {
        this.berthPool = ctx.registerResourcePool("terminal.berths", berths);
        this.cranePool = ctx.registerResourcePool("terminal.quay_cranes", quayCranes);

        this.arrivalStream = ctx.getRngStream("arrivals");
        this.vesselTypeStream = ctx.getRngStream("vessel_types");
        this.operationStream = ctx.getRngStream("operations");
        this.vesselCounter = 0;

        // Schedule first vessel arrival
        double lambdaPerSecond = arrivalRatePerDay / 86400.0;
        double firstArrival = arrivalStream.exponential(lambdaPerSecond);
        ctx.scheduleAfter(firstArrival, "VESSEL_ARRIVAL", null);
    }

    @Override
    public void onEvent(Event event, SimulationContext ctx) {
        switch (event.type()) {
            case "VESSEL_ARRIVAL" -> handleVesselArrival(ctx);
            case "BERTHING_COMPLETE" -> handleBerthingComplete(event, ctx);
            case "CARGO_COMPLETE" -> handleCargoComplete(event, ctx);
            default -> throw new IllegalArgumentException("Unknown terminal event: " + event.type());
        }
    }

    private void handleVesselArrival(SimulationContext ctx) {
        // Schedule subsequent arrival
        double lambdaPerSecond = arrivalRatePerDay / 86400.0;
        double nextArrival = arrivalStream.exponential(lambdaPerSecond);
        ctx.scheduleAfter(nextArrival, "VESSEL_ARRIVAL", null);

        // Sample vessel class
        double u = vesselTypeStream.nextDouble();
        String vesselClass;
        int moves;
        if (u < 0.45) {
            vesselClass = "FEEDER";
            moves = 250;
        } else if (u < 0.80) {
            vesselClass = "PANAMAX";
            moves = 650;
        } else {
            vesselClass = "POST_PANAMAX";
            moves = 1200;
        }

        String vesselId = "vessel-" + (++vesselCounter);
        Vessel vessel = new Vessel(vesselId, vesselClass, moves, ctx.now());
        ctx.metrics().incrementCounter("vessels.arrived");

        // Request berth
        berthPool.request(vessel.getId(), 1, 0, ctx.now(), berthLease -> {
            vessel.setBerthingTime(ctx.now());
            double berthWait = vessel.getBerthWaitTime();
            ctx.metrics().getOrCreateSampleMetric("vessel.berth_wait_time").record(berthWait);

            // 1800s (30 mins) pilotage and mooring maneuver
            ctx.scheduleAfter(1800.0, "BERTHING_COMPLETE", new BerthingRecord(vessel, berthLease));
        });
    }

    private void handleBerthingComplete(Event event, SimulationContext ctx) {
        BerthingRecord record = (BerthingRecord) event.payload();
        Vessel vessel = record.vessel();

        int cranesNeeded;
        if ("DYNAMIC".equalsIgnoreCase(cranePolicy)) {
            cranesNeeded = switch (vessel.getVesselClass()) {
                case "POST_PANAMAX" -> Math.min(4, quayCranes);
                case "PANAMAX" -> Math.min(3, quayCranes);
                default -> Math.min(2, quayCranes);
            };
        } else {
            // Static allocation: 2 cranes per vessel
            cranesNeeded = Math.min(2, quayCranes);
        }

        cranePool.request(vessel.getId(), cranesNeeded, 0, ctx.now(), craneLease -> {
            vessel.setAssignedCranes(cranesNeeded);
            vessel.setOperationsStartTime(ctx.now());

            // Calculate cargo duration: moves / (cranes * ratePerHour) * 3600
            double totalHandlingRatePerHour = cranesNeeded * movesPerHourPerCrane;
            double baseHours = vessel.getContainerMoves() / totalHandlingRatePerHour;
            double baseSeconds = baseHours * 3600.0;
            // Add operational variation (+/- 5%)
            double varFactor = 0.95 + (operationStream.nextDouble() * 0.10);
            double cargoDuration = baseSeconds * varFactor;

            CargoRecord cargoRecord = new CargoRecord(vessel, record.berthLease(), craneLease);
            ctx.scheduleAfter(cargoDuration, "CARGO_COMPLETE", cargoRecord);
        });
    }

    private void handleCargoComplete(Event event, SimulationContext ctx) {
        CargoRecord record = (CargoRecord) event.payload();
        Vessel vessel = record.vessel();

        vessel.setDepartureTime(ctx.now());

        // Release allocated resources
        cranePool.release(record.craneLease(), ctx.now());
        berthPool.release(record.berthLease(), ctx.now());

        // Record metrics
        double turnaroundTimeHours = vessel.getTurnaroundTime() / 3600.0;
        ctx.metrics().getOrCreateSampleMetric("vessel.turnaround_time_hours").record(turnaroundTimeHours);
        ctx.metrics().incrementCounter("containers.moved", vessel.getContainerMoves());
        ctx.metrics().incrementCounter("vessels.served");
    }

    private record BerthingRecord(Vessel vessel, ResourceLease berthLease) {}
    private record CargoRecord(Vessel vessel, ResourceLease berthLease, ResourceLease craneLease) {}
}
