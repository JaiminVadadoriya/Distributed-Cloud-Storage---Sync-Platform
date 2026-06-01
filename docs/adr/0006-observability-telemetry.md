# ADR 0006: Integrated Metrics, Tracing, and Health Logging

## Status
Approved

## Context
Operating a distributed storage system requires deep visibility into request traces, bucket access latencies, queue processing speeds, database query times, and cryptographic overheads.

## Decision
We configure OpenTelemetry (OTEL) comprehensively in the application:
- **Tracing**: Instrument ASP.NET Core, HttpClient, Entity Framework Core, and custom activity sources (`CloudStorage.Storage`). Disable Redis tracing during test executions to run in offline environments.
- **Metrics**: Expose HTTP client, runtime, and custom meters (`CloudStorage.Storage`) to track metrics (active uploads, chunk processing duration, encryption throughput).
- Export telemetry to collector endpoints via OTLP, secured under environment-specific flags.

## Consequences
- **Pros**: Standards-compliant logging and telemetry. Unified view of performance bottlenecks across components.
- **Cons**: Minor runtime footprint and network overhead from exporting telemetry data.
