package org.gris.core.model;

import java.util.Objects;

/**
 * An immutable discrete simulation event scheduled at a specific simulation time.
 * <p>
 * Ordering is strictly deterministic:
 * 1. Timestamp (ascending)
 * 2. Priority (ascending, lower value = higher priority)
 * 3. SequenceId (ascending insertion sequence for tie-breaking)
 *
 * @param sequenceId unique monotonically increasing sequence assigned by the engine
 * @param time       scheduled simulation time
 * @param priority   tie-breaking priority (0 is standard priority)
 * @param type       domain or engine event type name
 * @param payload    arbitrary contextual payload (e.g. entity, request)
 */
public record Event(
        long sequenceId,
        double time,
        int priority,
        String type,
        Object payload
) implements Comparable<Event> {

    public Event {
        Objects.requireNonNull(type, "Event type must not be null");
    }

    @Override
    public int compareTo(Event other) {
        int timeCmp = Double.compare(this.time, other.time);
        if (timeCmp != 0) {
            return timeCmp;
        }
        int prioCmp = Integer.compare(this.priority, other.priority);
        if (prioCmp != 0) {
            return prioCmp;
        }
        return Long.compare(this.sequenceId, other.sequenceId);
    }
}
