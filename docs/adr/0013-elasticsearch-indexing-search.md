# ADR 0013: Elasticsearch Indexing and Search

## Status
Approved

## Context
As the storage platform scales to millions of objects, relational querying on tags and metadata becomes slow and lacks full-text or vector search capabilities.

## Decision
We decouple search indexing from the primary metadata store by introducing a dedicated search catalog service interface. Ingestion pipelines process documents to extract texts and generate vector embeddings for semantic matches.

## Consequences
- **Pros**: Sub-second search times over millions of objects. Support for natural language semantic query vectors.
- **Cons**: Eventual consistency between the primary SQL DB and the search engine indices.
