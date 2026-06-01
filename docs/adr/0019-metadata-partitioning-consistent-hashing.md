# 19. Distributed Metadata Partitioning via Consistent Hashing

## Context
A centralized metadata repository becomes a performance bottleneck and single point of failure under hyperscale workloads (billions of objects). We need a horizontal sharding architecture.

## Decision
We implement distributed partitioning via a consistent hashing ring using virtual nodes (default 256 per physical node). Keys are mapped via FNV-1a hashing of the `{tenantId}:{objectKey}` composite string to achieve even distribution and minimize re-sharding impact.

## Consequences
- **Pros**: Balanced request load, minimal data migration when resizing clusters.
- **Cons**: Ring synchronization overhead across coordination cluster members.
