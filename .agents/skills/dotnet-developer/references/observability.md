# Observability (OTEL & Health)

CloudStorage is a distributed system, making observability critical for debugging and performance tuning.

## OpenTelemetry (OTEL)

We use OpenTelemetry for distributed tracing and metrics.

- **Tracing**: Automatically captures HTTP requests, DB queries (EF Core), and Redis calls.
- **Custom Spans**: If you implement a long-running background task, use `ActivitySource` to start a custom span.
- **Exporter**: Configured to export via OTLP to a collector (Prometheus/Jaeger).

## Prometheus Metrics

Custom metrics help track business performance (e.g., total bytes uploaded, active sync events).

- **Usage**: Use `prometheus-net` to expose a `/metrics` endpoint.
- **Registration**: Defined in `Program.cs`.

## Health Checks

Every service should have a health check registered.

- **API Health**: Checks local memory and startup state.
- **Dependency Health**:
  - `CheckPostgres`: Verifies DB connection.
  - `CheckRedis`: Verifies caching layer.
  - `CheckAzureStorage`: Verifies blob storage accessibility.
- **UI**: Visualized in the Admin Panel using the `AdminService`.

## Structured Logging
Always include relevant IDs (UserId, FileId, SessionId) in logarithmic scope to allow correlation across traces.
```csharp
using (_logger.BeginScope(new Dictionary<string, object> { ["UserId"] = userId }))
{
    _logger.LogInformation("Cleaning up old versions");
}
```
