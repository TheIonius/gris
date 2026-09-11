package org.gris.api.model;

import org.gris.core.model.Event;
import org.gris.core.model.SimulationContext;
import org.gris.core.model.SimulationModel;

import java.util.List;

/**
 * Decorator around SimulationModel that records the first N dispatched discrete events
 * into a thread-safe trace list for transparent calendar inspection.
 * Leaves the core simulation logic completely unmodified.
 */
public class TracingSimulationModel implements SimulationModel {

    private final SimulationModel delegate;
    private final List<EventTraceEntry> traceLog;
    private final int maxEntries;

    public TracingSimulationModel(SimulationModel delegate, List<EventTraceEntry> traceLog, int maxEntries) {
        this.delegate = delegate;
        this.traceLog = traceLog;
        this.maxEntries = maxEntries;
    }

    @Override
    public String name() {
        return delegate.name();
    }

    @Override
    public void init(SimulationContext ctx) {
        if (traceLog.size() < maxEntries) {
            traceLog.add(new EventTraceEntry(
                    0,
                    ctx.now(),
                    0,
                    "INIT",
                    "Model '" + delegate.name() + "' initialized; initial events scheduled"
            ));
        }
        delegate.init(ctx);
    }

    @Override
    public void onEvent(Event event, SimulationContext ctx) {
        if (traceLog.size() < maxEntries) {
            String desc = formatEventDescription(event, ctx);
            traceLog.add(new EventTraceEntry(
                    event.sequenceId(),
                    event.time(),
                    event.priority(),
                    event.type(),
                    desc
            ));
        }
        delegate.onEvent(event, ctx);
    }

    private String formatEventDescription(Event event, SimulationContext ctx) {
        String type = event.type();
        Object payload = event.payload();

        return switch (type) {
            case "ARRIVAL" -> "Scheduled customer/entity arrival dispatched into server queue";
            case "DEPARTURE" -> "Service completed; entity departing and server resource released";
            case "TRIP_REQUEST" -> "Passenger ride request arrived in zone";
            case "DISPATCH_TICK" -> "Batch dispatch optimization cycle running";
            case "PASSENGER_PICKUP" -> "Vehicle arrived at customer pickup location";
            case "TRIP_COMPLETION" -> "Trip completed; passenger delivered; vehicle idle";
            case "PASSENGER_CANCEL" -> "Passenger wait tolerance exceeded; ride cancelled";
            case "VESSEL_ARRIVAL" -> "Container vessel arrived in port waters; requesting berth";
            case "BERTH_ALLOCATION" -> "Berth allocated to awaiting vessel; quay cranes assigned";
            case "DISCHARGE_COMPLETION" -> "Container crane operations completed; cargo discharged";
            case "VESSEL_DEPARTURE" -> "Vessel departed berth; berth released for next arrival";
            default -> {
                if (payload != null) {
                    yield type + " (payload: " + payload.getClass().getSimpleName() + ")";
                }
                yield type + " executed at virtual time " + String.format("%.2f", event.time()) + "s";
            }
        };
    }
}
