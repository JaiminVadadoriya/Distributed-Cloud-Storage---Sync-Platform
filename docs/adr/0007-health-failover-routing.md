# ADR 0007: Dynamic Health-Based Routing and Circuit Breaker Failover

## Status
Approved

## Context
Cloud storage providers can experience outages or latency spikes. Hardcoding a single active provider leads to service interruptions. We need a system that routes traffic to the healthiest provider dynamically.

## Decision
We implement a dynamic health-based routing system:
- `IProviderHealthService` tracks exponential moving average (EMA) latencies and manages circuit breaker states (closed, open, half-open) for each provider in a Redis cache.
- `IStorageRoutingEngine` resolves the healthiest provider at runtime based on configured routing strategies (AvailabilityOptimized, LatencyOptimized, CostOptimized).
- `IFailoverCoordinator` transitions providers into failover states, notifying secondary clusters and publishing health change events.

## Consequences
- **Pros**: Automatic self-healing of the storage plane. Protection against transient cloud vendor outages.
- **Cons**: Complex testing requirements (mocking complex health scores). Consistency trade-offs during failovers.
