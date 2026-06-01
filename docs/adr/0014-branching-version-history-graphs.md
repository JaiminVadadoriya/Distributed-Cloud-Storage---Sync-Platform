# ADR 0014: Branching Version History Graphs

## Status
Approved

## Context
Standard object storage versions are linear. For collaborative workflows and enterprise sync, a linear sequence is insufficient to support branches, forks, and automated merges.

## Decision
We implement a DAG-based branching version graph service (`IVersionGraphService`). Every state change produces a `VersionNode` carrying parent identifiers, facilitating branching history, diffs, and 3-way merges.

## Consequences
- **Pros**: Clear lineage tracing. Prevents write conflicts by permitting diverging branches that can be merged.
- **Cons**: Increased metadata complexity. Requires conflict resolution strategies during merges.
