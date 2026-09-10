package org.gris.core.model;

import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Domain-agnostic entity representing an item that flows through the simulation system.
 * The engine does not inspect its semantic meaning (e.g., whether it is a taxi trip,
 * vessel, or container).
 */
public class Entity {
    private final String id;
    private final String type;
    private final double creationTime;
    private final Map<String, Object> attributes = new ConcurrentHashMap<>();

    public Entity(String id, String type, double creationTime) {
        this.id = Objects.requireNonNull(id, "Entity id cannot be null");
        this.type = Objects.requireNonNull(type, "Entity type cannot be null");
        this.creationTime = creationTime;
    }

    public String getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public double getCreationTime() {
        return creationTime;
    }

    public void setAttribute(String key, Object value) {
        attributes.put(key, value);
    }

    @SuppressWarnings("unchecked")
    public <T> T getAttribute(String key) {
        return (T) attributes.get(key);
    }

    public <T> T getAttributeOrDefault(String key, T defaultValue) {
        Object val = attributes.get(key);
        if (val == null) {
            return defaultValue;
        }
        @SuppressWarnings("unchecked")
        T casted = (T) val;
        return casted;
    }

    public boolean hasAttribute(String key) {
        return attributes.containsKey(key);
    }

    public Map<String, Object> getAttributes() {
        return Collections.unmodifiableMap(attributes);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Entity entity)) return false;
        return id.equals(entity.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }

    @Override
    public String toString() {
        return "Entity{" +
                "id='" + id + '\'' +
                ", type='" + type + '\'' +
                ", creationTime=" + creationTime +
                '}';
    }
}
