# 22. Global Namespace Federation Architecture

## Context
Tenants need a uniform path mapping to reference resources across multiple cloud providers and multi-region clusters without hardcoding vendor-specific keys.

## Decision
We design a global namespace registry that resolves virtual paths (e.g. `/docs/report.pdf`) to tenant-specific physical keys and regions, supporting path aliases and cross-cluster namespace federation.

## Consequences
- **Pros**: Full decoupling of client paths from storage providers.
- **Cons**: Extra lookup latency during the path translation phase.
