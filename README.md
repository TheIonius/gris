# Gris: Discrete-Event Simulation Engine

[![Java 21](https://img.shields.io/badge/Java-21-blue.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3.4.2-green.svg)](https://spring.io/projects/spring-boot)
[![Vite + React](https://img.shields.io/badge/Vite-React%2019-purple.svg)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%203-blue.svg)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A domain-agnostic discrete-event simulation (DES) and Monte Carlo platform in Java 21, designed for high-throughput stochastic modeling with an interactive React dashboard.

---

## Why Gris?

Most simulation tools fall into one of two extremes:
1. **Scripted Python packages (SimPy)**: Great for quick scripting, but quickly bottlenecked by single-threaded execution and the Global Interpreter Lock (GIL) when running hundreds of thousands of Monte Carlo replications.
2. **Proprietary desktop software (AnyLogic, Arena)**: Heavy, expensive, closed-source, and difficult to embed into modern CI/CD pipelines or headless web services.

Gris was built to bridge this gap: a fast, strongly typed core engine in Java 21 that executes independent seeded replications concurrently across CPU cores, coupled with a Spring Boot REST API, real-time SSE execution telemetry, and a modern React studio for scenario experimentation.

---

## Architecture & Pluggability

The simulation engine is decoupled from domain logic via Java's Service Provider Interface (`ServiceLoader`). New domain models implement `SimulationModelFactory` and register via `META-INF/services`, requiring zero changes to the core scheduling engine.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 gris-ui                                     │
│          (Interactive React Dashboard, Whisker 95% CIs, Ask Gris)           │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ HTTP / JSON
┌───────────────────────────────────────▼─────────────────────────────────────┐
│                                 gris-api                                    │
│       Spring Boot 3 REST API, SQLite Persistence, Async Replication Runner  │
└──────────────────┬────────────────────┬────────────────────┬────────────────┘
                   │                    │                    │
┌──────────────────▼──────┐  ┌──────────▼─────────┐  ┌───────▼────────────────┐
│      gris-mobility      │  │   gris-terminal    │  │        gris-nl         │
│  NYC TLC Urban Dispatch │  │ DP World Caucedo   │  │ Semantic Query Parser, │
│  Nearest / Batched /    │  │ Berths, STS Cranes │  │ Schema Bounds Check,   │
│  Prepositioning         │  │ Static vs Dynamic  │  │ 30-case Eval Harness   │
└──────────────────┬──────┘  └──────────┬─────────┘  └───────┬────────────────┘
                   │ SPI                │ SPI                │ SPI
┌──────────────────▼────────────────────▼────────────────────▼────────────────┐
│                                 gris-core                                   │
│  SimulationClock, Deterministic EventCalendar, ResourcePool, RngManager,    │
│  SampleMetric (Welford), TimeWeightedMetric, ReplicationRunner, 95% CIs     │
└─────────────────────────────────────────────────────────────────────────────┘
```

Adding a new domain model requires exactly **zero** modifications to `gris-core`. Both `gris-mobility` and `gris-terminal` were developed and plug into the core engine strictly via the `SimulationModelFactory` SPI.

---

## Project Structure

| Module | Description |
|---|---|
| [`gris-core`](gris-core) | Agnostic DES engine: simulation clock, deterministic calendar, resource pools, metrics (Welford algorithm), independent RNG streams, and Monte Carlo runner with Student-t 95% CIs. |
| [`gris-mobility`](gris-mobility) | NYC TLC urban mobility dispatch model across taxi zones (Manhattan, Brooklyn, Queens, JFK, LGA) with Nearest, Batched, and Prepositioning dispatch policies. |
| [`gris-terminal`](gris-terminal) | DP World Caucedo deep-sea container terminal operations (vessels, berths, quay cranes) with Static vs Dynamic crane allocation policies. |
| [`gris-nl`](gris-nl) | Natural-language scenario translator, confirmation contract, schema & bounds validator, and 30-case evaluation harness (100% accuracy). |
| [`gris-api`](gris-api) | Spring Boot 3 REST API, SQLite database persistence, async scenario runner, and embedded frontend delivery. |
| [`gris-ui`](gris-ui) | Modern Vite + React single-page dashboard with real-time replication monitoring, whisker CI plots, sensitivity sweeps, and export tools. |

---

## Statistical Validation: M/M/1 Queue Proof

To mathematically verify the simulation engine prior to running complex domains, `gris-core` is validated against analytical closed-form results for a classical $M/M/1$ queue:

$$\lambda = 0.50 \text{ arrivals/s}, \quad \mu = 1.00 \text{ services/s}, \quad \rho = \frac{\lambda}{\mu} = 0.50$$

Theoretical steady-state mean time in system $W$:
$$W = \frac{1}{\mu - \lambda} = \frac{1}{1.0 - 0.5} = 2.0000\text{ seconds}$$

### Empirical Monte Carlo Convergence (25 Replications, Horizon = 25,000s):

```
--- Monte Carlo Replications (R=25) ---
Theoretical W : 2.0000
Grand Mean W  : 1.9987
95% CI        : [1.9767, 2.0207] (half-width: ± 0.0220)
Server Util ρ : 0.4998 ± 0.0012
Result        : Theoretical W = 2.0000 is STRICTLY CAPTURED within 95% CI.
```

The validation suite (`MM1QueueValidationTest`) verifies that the theoretical mean is captured inside the 95% Student-t confidence interval on every build.

---

## Domain Models

### 1. NYC TLC Urban Mobility Dispatch (`gris-mobility`)
Simulates passenger ride requests and fleet vehicle dispatch calibrated against real NYC TLC trip distributions:
- **Spatial Matrix**: Manhattan, Brooklyn, Queens, JFK Airport, and LaGuardia Airport with realistic transit times.
- **Pluggable Dispatch Policies**:
  - `NEAREST`: Greedy assignment to closest available vehicle.
  - `BATCHED`: Buffers requests in a 15–30s window and solves bipartite min-cost matching.
  - `PREPOSITIONING`: Proactively relocates idle vehicles toward predicted high-demand zones.
- **Monte Carlo Comparison (N=10, Horizon=7200s, 95% CI)**:
  - `BATCHED` reduces average passenger wait time by **18.4%** compared to `NEAREST` under surge demand.

### 2. DP World Caucedo Container Terminal (`gris-terminal`)
Simulates deep-sea container logistics at DP World Caucedo (Dominican Republic):
- **Vessel Classes**: Feeder (250 moves), Panamax (650 moves), Post-Panamax (1200 moves).
- **Resources**: 3 deep-water berths, 8 Super Post-Panamax quay cranes (STS).
- **Crane Allocation Policies**:
  - `STATIC`: Fixed 2 quay cranes allocated per berthing vessel.
  - `DYNAMIC`: Proportional size-weighted allocation (up to 4 cranes on Post-Panamax vessels).
- **Policy Comparison (N=25, Horizon=14 days, 95% CI)**:
  - **Static Allocation**: Mean turnaround = **12.96 hrs** [95% CI: 12.14 – 13.77 hrs]
  - **Dynamic Allocation**: Mean turnaround = **9.58 hrs** [95% CI: 8.95 – 10.20 hrs]
  - **Result**: Dynamic allocation reduces vessel turnaround by **26.1%** with non-overlapping 95% confidence intervals ($p < 0.001$).

---

## Natural-Language Scenario Layer (`gris-nl`)

Translates plain-English scenario hypotheses into validated parameter contracts:

```bash
curl -s -X POST http://localhost:8080/api/ask \
  -H "Content-Type: application/json" \
  -d '{"prompt": "what if we lose 20% of vehicles in Brooklyn on Friday evening?", "execute": false}'
```

**Confirmation Contract Response**:
```json
{
  "rawPrompt": "what if we lose 20% of vehicles in Brooklyn on Friday evening?",
  "modelType": "mobility-dispatch",
  "suggestedName": "NYC Mobility Scenario: 320 vehicles (NEAREST, 1.3x demand)",
  "description": "Urban vehicle fleet dispatch across NYC TLC zones with 320 vehicles under NEAREST dispatch policy.",
  "horizon": 7200.0,
  "replications": 10,
  "parameters": {
    "fleetSize": 320,
    "policy": "NEAREST",
    "demandMultiplier": 1.3,
    "batchWindowSeconds": 20.0,
    "maxWaitTolerance": 600.0
  },
  "confidence": 0.90,
  "reasoning": "Applied 20% vehicle fleet reduction -> 320 vehicles. Detected rush hour / Friday evening context -> 1.3x baseline demand.",
  "warnings": [],
  "valid": true
}
```

The built-in evaluation harness (`NlEvaluationHarness`) verifies 30 diverse natural language queries spanning all domain models, conversational variants, and safety bounds (30/30 passed).

---

## Performance & Benchmarks

On an 8-core CPU (Temurin JDK 21, `-Xms256m -Xmx1024m`):
- **Core Event Calendar Throughput**: ~1.4 million events processed per second on a single thread.
- **Parallel Monte Carlo Execution**: 25 full replications of an M/M/1 queue (horizon 25,000s, ~25,000 events per replication) complete in under **1.8 seconds** across 8 worker threads.
- **Memory Overhead**: One-pass Welford algorithm requires $O(1)$ memory per tracked metric across any simulation horizon.

---

## Quickstart & Deployment

### Option 1: Docker Compose (Recommended)
```bash
docker compose up --build
```
Open `http://localhost:8080` in your browser.

### Option 2: Build & Run from Source (JDK 21 + Node 22)
```bash
# 1. Build React UI into Spring Boot static resources
cd gris-ui && npm install && npm run build && cd ..

# 2. Package and run executable JAR
mvn clean package -DskipTests
java -jar gris-api/target/gris-api-0.1.0-SNAPSHOT.jar
```
Open `http://localhost:8080` in your browser.

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/models` | List all discovered domain models and parameter schemas |
| `POST` | `/api/scenarios` | Submit a new Monte Carlo scenario for asynchronous simulation |
| `GET` | `/api/scenarios/{id}` | Poll scenario execution status and aggregated metrics with 95% CIs |
| `GET` | `/api/scenarios/{id}/stream` | Server-Sent Events (SSE) stream for real-time replication progress |
| `GET` | `/api/scenarios` | List all historical scenario runs |
| `POST` | `/api/ask` | Translate natural language prompt into validated scenario config |
| `GET` | `/` | Serves the interactive Gris web dashboard |

---

## Roadmap & Limitations

- **Distributed Replication Workers**: Currently, parallel replications run across local JVM worker threads. Distributing executions across a compute cluster via Kafka/Hazelcast is planned.
- **Continuous State Equations**: Gris is strictly a discrete-event simulator; continuous differential equations (System Dynamics) are not supported.
- **Additional Distributions**: Currently includes Exponential, Normal, Lognormal, Uniform, and empirical discrete PMFs. Adding Weibull and Gamma distributions for heavy-tailed equipment failure modeling is in progress.

---

## License

Released under the [MIT License](LICENSE).
