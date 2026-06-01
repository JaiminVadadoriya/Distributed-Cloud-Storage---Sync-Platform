# ADR 0012: Cluster Coordination and Consensus

## Status
Approved

## Context
A distributed storage orchestration platform must coordinate state updates (like node routing changes or failover states) consistently across the cluster to avoid split-brain scenarios.

## Decision
We implement a consensus layer inspired by the Raft algorithm. Node leader election is coordinated via distributed Redis leases (with safe local fallbacks), and state updates are proposed, replicated, and committed only upon majority quorum agreement.

## Consequences
- **Pros**: Strong consistency for critical routing configs. Resilient to node failures up to `(N-1)/2`.
- **Cons**: Write latency increases due to replication wait time. No consensus can be reached if a majority of nodes partition.
