# ADR 0015: Zero-Knowledge Client-Side Encryption

## Status
Approved

## Context
Server-side envelope encryption protects data at rest on the storage provider but leaves plaintext data accessible to the storage orchestrator during transit or in memory.

## Decision
We introduce a client-side zero-knowledge encryption service (`IClientEncryptionService`). Data is encrypted locally using AES-256-CBC before transmission, ensuring the storage orchestrator never receives or stores client secrets or keys.

## Consequences
- **Pros**: Ultimate data privacy and security. Orchestrator compromises do not expose user files.
- **Cons**: Client is fully responsible for key management; lost keys mean irrevocable data loss.
