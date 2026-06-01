# ADR 0001: Multi-Cloud Object Storage Provider Abstraction

## Status
Approved

## Context
The platform needs to support multiple object storage backends (AWS S3, Azure Blob Storage, Google Cloud Storage, MinIO, Local, etc.) interchangeably without code modification in the Core or Application layers. Historically, the platform was tightly coupled to Azure Blob Storage SDK.

## Decision
We introduce a clean provider-neutral abstraction layer in `CloudStorage.Application` consisting of:
- `IObjectStorageProvider`: Main interface representing basic file/blob operations.
- `ICapabilityNegotiator`: Dynamically inspects features supported by the target provider.
- `IStorageProviderFactory`: Resolves concrete providers dynamically at runtime based on configuration or routing decisions.

All cloud-specific SDK namespaces (`Azure.Storage.Blobs`, `Amazon.S3`, etc.) are isolated strictly to the `CloudStorage.Infrastructure` project.

## Consequences
- **Pros**: Zero vendor lock-in. Simple integration of future storage providers. Easier unit testing of core business logic.
- **Cons**: Small runtime resolution overhead; capabilities negotiation must be carefully mapped to avoid lowest-common-denominator limitations.
