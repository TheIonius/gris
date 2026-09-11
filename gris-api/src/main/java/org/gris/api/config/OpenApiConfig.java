package org.gris.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI grisOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Gris - Discrete-Event Simulation API")
                        .description("High-performance discrete-event simulation engine with Monte Carlo replications, parameter sensitivity sweeps, real-time SSE streaming, and natural language scenario synthesis.")
                        .version("0.1.0"));
    }
}
