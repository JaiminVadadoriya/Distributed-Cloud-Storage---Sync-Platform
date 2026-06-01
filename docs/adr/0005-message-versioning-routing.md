# ADR 0005: Resilient Messaging Queue Architecture and Versioning

## Status
Approved

## Context
Asynchronous events (sync tasks, replication jobs, health alerts) are dispatched across multiple services via RabbitMQ. We need a way to support protocol evolutionary changes (message schemas) and protect consumers from transient message broker failures.

## Decision
We enforce a robust messaging architecture:
- Metadata attributes (`Type` headers containing assembly-qualified type name and schema versions) are attached to all AMQP messages.
- RabbitMQ queues are created with safe DLX/DLQ parameters: message expiration (TTL), dead-letter exchange bindings, and limits.
- Consumers process retry counts dynamically from the headers and redirect failing messages to dead-letter queues after exceeding maximum attempts to prevent poison-pill blocking.

## Consequences
- **Pros**: Schema evolution compatibility. Zero message loss on temporary server drops. Solves poison-pill thread blocks.
- **Cons**: Complex configuration parameters; message deserialization overhead from version headers.
