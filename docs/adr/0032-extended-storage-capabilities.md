# 32. Extended Storage Capabilities (Region/Jurisdiction)

## Context
Data sovereignty policies require the platform to identify where bits physically land.

## Decision
We extend the `IStorageCapabilities` interface with `Region` and `Jurisdiction` metadata. All cloud provider implementations populate these values so the compliance framework can validate geo-restrictions.

## Consequences
- **Pros**: Enforces data sovereignty rules at the provider initialization stage.
- **Cons**: Minor breaking changes to the `IStorageCapabilities` implementations (now updated).
