# ADR 0018: Chaos and Fault Injection Engineering

## Status
Approved

## Context
Production distributed systems suffer from network partitions, service latency spikes, and storage provider downtime. We must proactively verify the platform's self-healing capabilities.

## Decision
We implement a chaos engineering framework (`IChaosTestingService`). This allows developers and test harnesses to inject controlled failure rates and latency spikes directly into storage and consensus provider pipelines.

## Consequences
- **Pros**: Validates resiliency policies (Polly retries and provider failover) under realistic failure conditions.
- **Cons**: Fault injection must be strictly restricted to prevent accidental execution in production environments.
