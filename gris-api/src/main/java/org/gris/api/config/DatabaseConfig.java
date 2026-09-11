package org.gris.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;

@Configuration
public class DatabaseConfig {
    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    public ApplicationRunner initializeDatabase(JdbcClient jdbcClient) {
        return args -> {
            log.info("Initializing SQLite database schema and WAL mode...");
            try {
                jdbcClient.sql("PRAGMA journal_mode = WAL;").query().singleValue();
                jdbcClient.sql("PRAGMA busy_timeout = 5000;").query().singleValue();
            } catch (Exception e) {
                log.warn("Could not set SQLite pragmas: {}", e.getMessage());
            }
            jdbcClient.sql("""
                    CREATE TABLE IF NOT EXISTS scenarios (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        model_type TEXT NOT NULL,
                        horizon REAL NOT NULL,
                        replications INTEGER NOT NULL,
                        seed_base INTEGER NOT NULL,
                        status TEXT NOT NULL,
                        parameters_json TEXT NOT NULL,
                        results_json TEXT,
                        error_message TEXT,
                        created_at TEXT NOT NULL,
                        completed_at TEXT,
                        wall_clock_ms INTEGER
                    );
                    """).update();
            log.info("Database schema initialized successfully.");
        };
    }
}
