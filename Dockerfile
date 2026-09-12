# ------------------------------------------------------------------------------
# Stage 1: Build Frontend UI (Vite + React)
# ------------------------------------------------------------------------------
FROM node:22-alpine AS ui-builder
WORKDIR /app/gris-ui

COPY gris-ui/package*.json ./
RUN npm ci

COPY gris-ui/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build Multi-Module Java Backend
# ------------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21-alpine AS backend-builder
WORKDIR /app

COPY pom.xml ./
COPY gris-core/pom.xml gris-core/
COPY gris-mobility/pom.xml gris-mobility/
COPY gris-terminal/pom.xml gris-terminal/
COPY gris-nl/pom.xml gris-nl/
COPY gris-api/pom.xml gris-api/

# Copy sources
COPY gris-core/src gris-core/src
COPY gris-mobility/src gris-mobility/src
COPY gris-terminal/src gris-terminal/src
COPY gris-nl/src gris-nl/src
COPY gris-api/src gris-api/src

# Copy UI build output to Spring Boot static resources
COPY --from=ui-builder /app/gris-api/src/main/resources/static/ gris-api/src/main/resources/static/

# Package runnable application
RUN mvn clean package -DskipTests

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app

# Create dedicated non-root application user and group
RUN addgroup -S grisgroup && adduser -S grisuser -G grisgroup

# Create data directory for SQLite persistence with non-root ownership
RUN mkdir -p /app/data && chown -R grisuser:grisgroup /app && chmod 755 /app/data

# Copy built Spring Boot executable JAR with non-root ownership
COPY --from=backend-builder --chown=grisuser:grisgroup /app/gris-api/target/gris-api-*.jar /app/gris-app.jar

ENV PORT=8080 \
    GRIS_DB_PATH=/app/data/gris.db \
    JAVA_OPTS="-Xms256m -Xmx1024m -XX:+UseG1GC"

EXPOSE 8080

USER grisuser

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/gris-app.jar --spring.datasource.url=jdbc:sqlite:$GRIS_DB_PATH"]
