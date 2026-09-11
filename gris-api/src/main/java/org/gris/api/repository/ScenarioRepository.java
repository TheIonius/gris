package org.gris.api.repository;

import org.gris.api.model.ScenarioStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class ScenarioRepository {

    private final JdbcClient jdbcClient;

    public ScenarioRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void insert(ScenarioEntity s) {
        jdbcClient.sql("""
                INSERT INTO scenarios (
                    id, name, description, model_type, horizon, replications, seed_base,
                    status, parameters_json, results_json, error_message, created_at,
                    completed_at, wall_clock_ms
                ) VALUES (
                    :id, :name, :description, :modelType, :horizon, :replications, :seedBase,
                    :status, :parametersJson, :resultsJson, :errorMessage, :createdAt,
                    :completedAt, :wallClockMs
                )
                """)
                .param("id", s.id())
                .param("name", s.name())
                .param("description", s.description())
                .param("modelType", s.modelType())
                .param("horizon", s.horizon())
                .param("replications", s.replications())
                .param("seedBase", s.seedBase())
                .param("status", s.status().name())
                .param("parametersJson", s.parametersJson())
                .param("resultsJson", s.resultsJson())
                .param("errorMessage", s.errorMessage())
                .param("createdAt", s.createdAt() != null ? s.createdAt().toString() : null)
                .param("completedAt", s.completedAt() != null ? s.completedAt().toString() : null)
                .param("wallClockMs", s.wallClockMs())
                .update();
    }

    public void updateStatusAndResults(
            String id,
            ScenarioStatus status,
            String resultsJson,
            String errorMessage,
            Instant completedAt,
            Long wallClockMs
    ) {
        jdbcClient.sql("""
                UPDATE scenarios SET
                    status = :status,
                    results_json = :resultsJson,
                    error_message = :errorMessage,
                    completed_at = :completedAt,
                    wall_clock_ms = :wallClockMs
                WHERE id = :id
                """)
                .param("id", id)
                .param("status", status.name())
                .param("resultsJson", resultsJson)
                .param("errorMessage", errorMessage)
                .param("completedAt", completedAt != null ? completedAt.toString() : null)
                .param("wallClockMs", wallClockMs)
                .update();
    }

    public void update(ScenarioEntity s) {
        jdbcClient.sql("""
                UPDATE scenarios SET
                    name = :name,
                    description = :description,
                    status = :status,
                    parameters_json = :parametersJson,
                    results_json = :resultsJson,
                    error_message = :errorMessage,
                    completed_at = :completedAt,
                    wall_clock_ms = :wallClockMs
                WHERE id = :id
                """)
                .param("id", s.id())
                .param("name", s.name())
                .param("description", s.description())
                .param("status", s.status().name())
                .param("parametersJson", s.parametersJson())
                .param("resultsJson", s.resultsJson())
                .param("errorMessage", s.errorMessage())
                .param("completedAt", s.completedAt() != null ? s.completedAt().toString() : null)
                .param("wallClockMs", s.wallClockMs())
                .update();
    }

    public Optional<ScenarioEntity> findById(String id) {
        return jdbcClient.sql("SELECT * FROM scenarios WHERE id = :id")
                .param("id", id)
                .query(this::mapRow)
                .optional();
    }

    public List<ScenarioEntity> findAll() {
        return jdbcClient.sql("SELECT * FROM scenarios ORDER BY created_at DESC")
                .query(this::mapRow)
                .list();
    }

    public boolean deleteById(String id) {
        int rows = jdbcClient.sql("DELETE FROM scenarios WHERE id = :id")
                .param("id", id)
                .update();
        return rows > 0;
    }

    public int deleteAll() {
        return jdbcClient.sql("DELETE FROM scenarios")
                .update();
    }

    private ScenarioEntity mapRow(ResultSet rs, int rowNum) throws SQLException {
        String createdAtStr = rs.getString("created_at");
        String completedAtStr = rs.getString("completed_at");
        Long wallClockMs = rs.getObject("wall_clock_ms") != null ? rs.getLong("wall_clock_ms") : null;

        return new ScenarioEntity(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("model_type"),
                rs.getDouble("horizon"),
                rs.getInt("replications"),
                rs.getLong("seed_base"),
                ScenarioStatus.valueOf(rs.getString("status")),
                rs.getString("parameters_json"),
                rs.getString("results_json"),
                rs.getString("error_message"),
                createdAtStr != null ? Instant.parse(createdAtStr) : null,
                completedAtStr != null ? Instant.parse(completedAtStr) : null,
                wallClockMs
        );
    }
}
