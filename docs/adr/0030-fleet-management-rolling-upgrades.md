# 30. Fleet Management and Rolling Upgrades

## Context
Deploying software upgrades across a multi-region distributed cluster of nodes can cause downtime or partition loss if executed naively.

## Decision
We implement a cluster fleet management layer. It tracks node status (Active, Draining, Maintenance, Decommissioned) and conducts rolling upgrades by cordoning, draining connections, and updating node versions sequentially.

## Consequences
- **Pros**: Zero-downtime upgrades, gradual canary-style deployment of system updates.
- **Cons**: Longer total duration to update the entire global node fleet.
