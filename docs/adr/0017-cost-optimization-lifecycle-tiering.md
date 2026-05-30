# ADR 0017: Cost Optimization and Lifecycle Tiering

## Status
Approved

## Context
Enterprise customers require visibility into storage costs across different cloud providers, along with recommendations to optimize lifecycle policies.

## Decision
We implement a `ICostOptimizationEngine` to forecast costs for S3, Azure, and MinIO based on current usage. The engine generates lifecycle recommendations by identifying files that can be tiered down to archive storage.

## Consequences
- **Pros**: Clear visibility into cross-cloud costs. Automated suggestions maximize cost savings.
- **Cons**: Archiving files reduces immediate availability. Cost forecasts are estimates based on standard cloud base pricing.
