# ADR 0008: Automatic Object Lifecycle Policies and Storage Tiering

## Status
Approved

## Context
Storing data on high-performance storage classes (Hot) indefinitely is cost-prohibitive. We need a way to transition files automatically to cheaper storage classes (Cool, Cold, Archive) and clean up expired objects.

## Decision
We implement a lifecycle management system:
- `IStorageTieringService`: Exposes operations to transition files native to provider capabilities (Azure SetAccessTier, S3 CopyObject class modifications).
- `ILifecyclePolicyEngine`: Periodically evaluates object lifecycles (`StorageObjectLifecycle` db entity) against active configuration-based lifecycle rules, executing transitions or object deletions.
- Integrates restoration mechanisms for archived objects back to hot tiers.

## Consequences
- **Pros**: Significant cost reductions on cloud storage. Compliance-driven automated cleanups.
- **Cons**: Archival transitions incur retrieval fees and latency during rehydration. Requires persistent lifecycle logs.
