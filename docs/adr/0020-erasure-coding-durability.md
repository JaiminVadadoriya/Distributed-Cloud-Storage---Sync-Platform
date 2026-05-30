# 20. Erasure Coding for Storage-Efficient Durability

## Context
Multi-region replication provides high reliability but introduces high storage overhead (3x storage amplification). For archival/cold data, we need space-efficient durability.

## Decision
We implement a Reed-Solomon erasure coding engine. Objects are split into $N$ data shards and $M$ parity shards (e.g. 4+2). Any $N$ shards are sufficient to reconstruct the original payload.

## Consequences
- **Pros**: Low storage overhead (1.5x amplification for 4+2 compared to 3.0x for replication).
- **Cons**: High CPU usage and execution latency due to matrix arithmetic.
