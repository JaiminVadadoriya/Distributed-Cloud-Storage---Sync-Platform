# 26. Storage Billing and Metering Platform

## Context
Multi-tenant storage systems need precise usage billing (storage space-time, API calls, and ingress/egress bytes).

## Decision
We implement a real-time metering recorder. Tenant write/read activities log usage data into aggregators to generate monthly invoices based on configurable provider rate cards.

## Consequences
- **Pros**: Transparent pricing and cost allocation.
- **Cons**: High activity workloads cause metering write amplification.
