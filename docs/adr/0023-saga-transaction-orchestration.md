# 23. Distributed Transaction Saga Orchestration

## Context
Multi-cloud workflows require atomicity across isolated remote systems (e.g. metadata writes and physical file uploads). Lock-based 2PC does not scale over WAN.

## Decision
We implement a distributed transaction orchestrator using the Saga pattern. Operations register step execute and compensation workflows. If a step fails, the saga runner applies backward compensation.

## Consequences
- **Pros**: High performance, eventual consistency, avoids distributed deadlocks.
- **Cons**: Requires custom rollbacks (compensation handlers) to be written for all steps.
