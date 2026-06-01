# ADR 0009: Content-Defined Chunking (CDC) Deduplication

## Status
Approved

## Context
Fixed-size chunking leads to the boundary-shift problem, where a single byte insertion at the start of a file changes the hashes of all subsequent chunks, rendering deduplication ineffective.

## Decision
We implement Content-Defined Chunking (CDC) utilizing the FastCDC algorithm. By using a rolling Gear Hash on a sliding window, we dynamically determine chunk boundaries based on content fingerprints, aiming for configurable average chunk sizes.

## Consequences
- **Pros**: Exceptionally high deduplication ratios for modified files or appending datasets.
- **Cons**: High CPU overhead from rolling hash computations compared to fixed-size boundary slices.
