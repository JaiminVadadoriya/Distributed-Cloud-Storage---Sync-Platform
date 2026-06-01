# ADR 0002: Distributed Locking and Metadata State Consistency

## Status
Approved

## Context
When synchronizing files in a distributed, multi-client system, concurrent updates to metadata can cause database race conditions, split-brain scenarios, and duplicate uploads. We need a reliable distributed locking mechanism.

## Decision
We leverage Redis as the distributed lock provider:
- Implement `IDistributedLockProvider` using Redlock algorithms (via `StackExchange.Redis`).
- Introduce locking keys scoped by file ID or chunk checksum during chunk uploads and metadata modifications.
- Implement pessimistic lock acquisition with an automatic expiration lease to ensure locks are released even if the coordinator crashes.

## Consequences
- **Pros**: Strong consistency across multiple api nodes. Prevents double-uploads of chunk files.
- **Cons**: Dependency on a highly-available Redis cluster. Increased latency due to lock acquisition roundtrips.
