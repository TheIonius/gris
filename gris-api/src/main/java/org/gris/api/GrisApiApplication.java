package org.gris.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class GrisApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(GrisApiApplication.class, args);
    }
}
