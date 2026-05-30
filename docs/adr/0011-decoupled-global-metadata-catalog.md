# ADR 0011: Decoupled Global Metadata Catalog

## Status
Approved

## Context
Cloud provider storage abstractions can lead to vendor lock-in if file metadata (size, hash, tier) is stored within the cloud provider's native properties rather than a decoupled orchestrator layer.

## Decision
We decouple object metadata from physical storage provider headers. All metadata is managed in a global catalog backing store via `IMetadataService` and `IMetadataRepository` (persisted in EF Core database and backed by Redis/in-memory caches).

## Consequences
- **Pros**: Zero vendor lock-in. Immediate querying of file listings across multiple providers without API calls to target clouds.
- **Cons**: Requires keeping the database metadata synchronized with the actual physical files.
