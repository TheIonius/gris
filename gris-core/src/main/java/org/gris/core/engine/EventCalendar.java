package org.gris.core.engine;

import org.gris.core.model.Event;

import java.util.PriorityQueue;

/**
 * Event calendar maintaining scheduled events in strict deterministic order.
 * Underlying structure is a PriorityQueue ordered by Event's natural ordering
 * (timestamp -> priority -> sequenceId).
 */
public class EventCalendar {
    private final PriorityQueue<Event> queue;
    private long totalScheduledCount;
    private long totalProcessedCount;

    public EventCalendar() {
        this.queue = new PriorityQueue<>();
        this.totalScheduledCount = 0;
        this.totalProcessedCount = 0;
    }

    public void schedule(Event event) {
        if (event == null) {
            throw new IllegalArgumentException("Cannot schedule null event");
        }
        queue.add(event);
        totalScheduledCount++;
    }

    public Event peek() {
        return queue.peek();
    }

    public Event poll() {
        Event event = queue.poll();
        if (event != null) {
            totalProcessedCount++;
        }
        return event;
    }

    public boolean cancel(Event event) {
        return queue.remove(event);
    }

    public boolean isEmpty() {
        return queue.isEmpty();
    }

    public int size() {
        return queue.size();
    }

    public long getTotalScheduledCount() {
        return totalScheduledCount;
    }

    public long getTotalProcessedCount() {
        return totalProcessedCount;
    }

    public void clear() {
        queue.clear();
        totalScheduledCount = 0;
        totalProcessedCount = 0;
    }
}
