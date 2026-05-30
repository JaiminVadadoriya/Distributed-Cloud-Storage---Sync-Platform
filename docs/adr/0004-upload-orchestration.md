# ADR 0004: Dynamic Chunked/Multipart Upload Strategy Orchestration

## Status
Approved

## Context
Files vary greatly in size (from bytes to gigabytes). Cloud storage providers require different mechanisms to optimize large files (S3 Multipart Upload, Azure Block List commits, Google Resumable uploads, local simple streams). We need to optimize network bandwidth and storage efficiency.

## Decision
We implement a strategy pattern via `IUploadOrchestrator`:
- `ICapabilityNegotiator` inspects file size and provider, resolving to a specific `UploadStrategyType`.
- Concrete strategies (`StreamUploadStrategy`, `MultipartUploadStrategy`, `BlockBlobUploadStrategy`, `ResumableUploadStrategy`) encapsulate vendor-specific multipart uploads.
- Stream data is wrapped in a progress-tracking stream to allow real-time upload progress reporting to callers.

## Consequences
- **Pros**: Dynamic selection of the most efficient upload path. Robust handling of large uploads.
- **Cons**: Added complexity in matching strategy to provider capabilities; requires comprehensive error handling for failed block commits.
