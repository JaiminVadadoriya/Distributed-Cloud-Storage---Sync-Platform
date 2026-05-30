# ADR 0016: Multi-Tenant SaaS Isolation

## Status
Approved

## Context
In a multi-tenant SaaS storage orchestrator serving multiple enterprise accounts, it is critical to guarantee data boundary isolation and enforce quotas to prevent noisy neighbors.

## Decision
We enforce strict tenant boundaries via `ITenantIsolationProvider` resolving request tenant context. Database records are filtered by tenant ID, storage quotas are checked during chunk uploads, and tenant encryption keys are isolated using HMAC derivations.

## Consequences
- **Pros**: Complete tenant logical separation. Robust quota safety.
- **Cons**: Development complexity when writing cross-tenant reports or shared system entities.
