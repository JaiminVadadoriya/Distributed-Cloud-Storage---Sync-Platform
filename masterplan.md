# Masterplan.md – Distributed Cloud Storage & Sync Platform

## 1. App Overview and Objectives

This project is a **distributed, scalable cloud storage and synchronization platform**. It supports large files (up to 50GB) and focuses on **distributed systems concepts, file sync algorithms, and offline-first operation**. The system is designed to challenge technical limits while remaining modular, secure, and performant.

**Objectives:**

* Enable **large file storage and cross-device synchronization**.
* Implement **chunked uploads, deduplication, delta sync, and resumable transfers**.
* Maintain **offline-first operation** with conflict detection and versioning.
* Build an **event-driven, stateless backend** with **real-time updates** via SignalR.
* Ensure **scalability, high availability, and low latency**, capable of supporting millions of users.
* Design **modular architecture** for future feature expansion.

---

## 2. Target Audience

* **Enterprises** requiring reliable, scalable cloud storage.
* **General users** storing files with offline and cross-device sync needs.

---

## 3. Core Features and Functionality

* **File Upload & Downloads:** Chunked, resumable, delta-aware, support for very large files.
* **Offline Editing:** Track changes per device; merge automatically or create conflict copies.
* **Version History:** Maintain full version history for safety.
* **File Sharing:** Owner-based default with flexible read/write roles.
* **Cross-Device Sync:** Real-time push updates using SignalR.
* **Conflict Handling:** Version vectors + automatic merges or conflict copies.
* **Metadata Management:** Stored in PostgreSQL for transactional consistency.
* **Raw File Storage:** Stored in Azure Blob Storage with durability and geo-redundancy.

---

## 4. High-Level Technical Stack

| Layer              | Technology                                                    | Notes / Rationale                                          |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------- |
| Frontend           | Angular                                                       | Web MVP, offline-aware, chunk-aware, responsive UI         |
| Backend            | .NET (Dockerized)                                             | Stateless, event-driven microservices                      |
| Metadata DB        | PostgreSQL                                                    | Transactional consistency, versioning, scalable partitions |
| File Storage       | Azure Blob Storage                                            | Durable, geo-redundant, large object storage               |
| Real-Time Sync     | SignalR                                                       | Push notifications for cross-device updates                |
| Authentication     | JWT + Email/Password + optional OAuth                         | Secure, stateless sessions                                 |
| Security           | TLS everywhere, server-side & optional client-side encryption | Enterprise-grade security                                  |
| Messaging / Events | Event-driven architecture                                     | Modular, supports future features like collaboration       |

---

## 5. Conceptual Data Model

* **Users:** User info, auth credentials, device list.
* **Files:** Metadata (name, owner, size, chunk hashes, version vector, timestamps).
* **Chunks:** Blob references, size, hash.
* **Permissions:** Access control per file/folder, read/write roles.
* **Sync Events:** Track updates, deletions, conflicts.

---

## 6. User Interface Design Principles

* **Offline-aware:** Clearly indicate offline/online state.
* **Chunk-aware:** Show upload/download progress per chunk.
* **Conflict Indicators:** Highlight conflicts and allow user resolution.
* **Version History:** Access to previous versions and restore functionality.
* **Responsive:** UI remains interactive regardless of backend operations.

---

## 7. Security Considerations

* **Transport:** TLS for all connections.
* **At-rest:** Server-side encryption in Azure Blob, optional client-side encryption.
* **Access Control:** Owner-based default, flexible read/write sharing.
* **Authentication:** JWT tokens with optional OAuth.

---

## 8. Development Phases / Milestones

1. **MVP Web App:** Angular frontend, .NET backend, PostgreSQL metadata, Blob storage integration. [COMPLETE]
2. **Chunked Uploads & Resumable Transfers:** Implement chunk strategy and delta sync. [COMPLETE]
3. **Offline-First + Versioning:** Track offline edits, version vectors, conflict handling. [COMPLETE]
4. **Real-Time Sync:** SignalR push notifications across devices. [COMPLETE]
5. **Security & Access Control:** TLS, encryption, permission enforcement. [COMPLETE]
6. **Scalability & Partitioning:** Partition metadata DB, test with simulated large user base. [COMPLETE]
7. **Optional Enhancements:** Modular integrations, future features (collaboration, AI deduplication, advanced search). [COMPLETE]
8. **Architecture Modernization:** Transition to OOP core/shared structure, Signal-based state. [COMPLETE]
9. **Advanced Data Management:** Implementation of Version History and Bulk Operations. [COMPLETE]
10. **Notification Persistence:** Database-backed alerts and activity tracking. [COMPLETE]
11. **Comprehensive Frontend UI:** 16+ Feature areas including Trash, Recent, Sync History, Conflict Center, and enhanced Settings. [COMPLETE]

---

## 9. Potential Challenges and Solutions

| Challenge                        | Solution                                             |
| -------------------------------- | ---------------------------------------------------- |
| Large file uploads               | Chunking + resumable uploads + delta sync            |
| Offline edits + conflicts        | Version vectors + conflict copies + automatic merges |
| Cross-region latency             | Async replication + SignalR push notifications       |
| Metadata scaling                 | Early partitioning, sharding if necessary            |
| Deduplication complexity         | Content-based chunking + hashing                     |
| Real-time notifications at scale | Event-driven architecture, hub scaling               |

---

## 10. Future Expansion Possibilities

* Team collaboration features (shared folders, notifications).
* Search indexing across file content.
* AI-assisted deduplication and storage optimization.
* Mobile or desktop clients.
* Advanced analytics or usage tracking for enterprise users.

