# 28. Multi-Protocol Storage Gateway (S3/WebDAV)

## Context
Legacy systems and desktop mounts require standard file protocol access (e.g. S3 clients, file explorer WebDAV mounts) rather than vendor custom APIs.

## Decision
We implement a storage protocol gateway. S3 API (GET/PUT/DELETE/HEAD/List) and WebDAV verbs are translated to internal object and metadata operations.

## Consequences
- **Pros**: Zero-code client integration, wide client tool compatibility.
- **Cons**: Gateway translation adds minimal parsing and format conversion latency.
