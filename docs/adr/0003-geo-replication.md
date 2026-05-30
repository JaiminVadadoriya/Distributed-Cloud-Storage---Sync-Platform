# ADR 0003: Active-Passive Cross-Region Data Replication

## Status
Approved

## Context
Enterprise storage systems require high availability and disaster recovery across geographical regions. We need a way to mirror objects uploaded to a primary region to fallback regions asynchronously.

## Decision
We implement a queue-driven, asynchronous cross-region replication system:
- `ReplicationCoordinator`: Intercepts complete uploads, checks active replication policies in configuration, records a pending `ReplicationJob` in Redis/DB, and publishes a command to RabbitMQ.
- `ReplicationProvider`: A background consumer picks up `ReplicateObjectCommand` messages, streams the object from the source provider, and uploads it to the target provider.
- Utilizes dead-letter exchanges (DLX/DLQ) with incremental retries and exponential backoff for replication tasks.

## Consequences
- **Pros**: High resilience against regional storage outages. Decoupled async processing protects hot upload path latency.
- **Cons**: Eventual consistency between regions. Storage consumption doubles or triples based on configured target regions.
