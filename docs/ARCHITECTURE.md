# Architecture Document — Distributed Cloud Storage Platform

> **Version:** 3.0 &nbsp;|&nbsp; **Last Updated:** June 2026

---

## 1. System Overview

The Distributed Cloud Storage Platform is a full-stack application built using **Clean Architecture** principles. It provides scalable, chunked file storage with deduplication, resumable uploads, JWT-based authentication, and cross-device synchronization capabilities.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose Stack                         │
│                                                                    │
│  ┌───────────────┐      ┌───────────────┐      ┌────────────────┐  │
│  │  NGINX LB     │─────▶│ API Cluster   │◀────▶│  Redis (Cache)  │  │
│  │  :5000        │      │ (3x Replicas) │      │  :6379         │  │
│  └───────▲───────┘      └───────┬───────┘      └────────────────┘  │
│          │                      │                       │          │
│  ┌───────┴───────┐      ┌───────▼───────┐      ┌────────▼───────┐  │
│  │  Angular 21   │      │  RabbitMQ     │      │  PostgreSQL 16 │  │
│  │  Client       │      │  (Workers)    │◀─────▶  (Metadata DB) │  │
│  │  :4200        │      │  :5672        │      │  :5433         │  │
│  └───────────────┘      └───────────────┘      └────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.1 Distributed Scale-Out Components

- **NGINX Load Balancer:** Entry point for all API/SignalR traffic. Performs round-robin distribution to API instances.
- **API Cluster:** Horizontal scaling via Docker replicas. All instances share the same database and storage.
- **Redis Service:** Used for **SignalR backplane** (real-time sync across nodes), distributed caching, and upload session locks.
- **RabbitMQ Service:** Asynchronous message broker for offloading non-blocking heavy tasks (chunk validation, cleanup).
- **MinIO:** S3-compatible object storage for chunk storage in development; pluggable via `IObjectStorageProvider`.
- **Observability Stack:** OTel Collector receives telemetry and exports to Prometheus (metrics), Loki (logs), and Jaeger (traces); Grafana provides unified dashboards.

---

## 2. Clean Architecture Layers

The backend strictly follows **Clean Architecture** with unidirectional dependency flow:

```
               ┌─────────────────────────────────┐
               │         CloudStorage.API         │  ← Entry Point
               │   Controllers · Program.cs       │
               │   Swagger · Auth Middleware       │
               └──────────────┬──────────────────┘
                              │ depends on
               ┌──────────────▼──────────────────┐
               │     CloudStorage.Application     │  ← Business Logic
               │   Interfaces · DTOs · Contracts  │
               └──────────────┬──────────────────┘
                              │ depends on
     ┌────────────────────────▼───────────────────────────┐
     │            CloudStorage.Infrastructure             │  ← Implementation
     │   DbContext · Repositories · Services · Migrations │
     └────────────────────────┬───────────────────────────┘
                              │ depends on
               ┌──────────────▼──────────────────┐
               │       CloudStorage.Domain        │  ← Core
               │   Entities · Interfaces · Enums  │
               └─────────────────────────────────┘
```

### 2.1 Domain Layer (`CloudStorage.Domain`)

The innermost layer — zero external dependencies.

| Component              | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `User`                 | User account with authentication and device tracking             |
| `FileMetadata`         | File record with versioning, upload session tracking, and status |
| `FileChunk`            | Individual chunk reference with hash-based deduplication         |
| `ChunkRegistry`        | Global chunk registry keyed by SHA-256 hash                      |
| `Folder`               | Hierarchical folder with nested subfolders, files, and permissions |
| `Device`               | User device for cross-device sync                                |
| `FilePermission`       | Access control (Read/Write/Owner) per file per user              |
| `FolderPermission`     | Access control per folder per user (inherits `PermissionBase`)   |
| `PermissionBase`       | Abstract base for all permission entities                        |
| `Notification`         | User notification with type, title, message, and read status     |
| `ActivityLog`          | User activity audit trail (action, target, timestamp)            |
| `RefreshToken`         | JWT refresh token with revocation support                        |
| `PasswordResetToken`   | Time-limited token for password reset flows                      |
| `SyncEvent`            | Synchronization event log per file per device                    |
| `StorageObjectLifecycle` | Tracks storage tier transitions per file per provider          |
| `DbObjectMetadata`     | Multi-tenant object metadata with tier tracking and tagging      |
| `BaseEntity<T>`        | Generic base entity with typed primary key                       |
| `BaseAuditableEntity<T>` | Adds `CreatedAt` audit timestamps to `BaseEntity`              |
| `IOwnedEntity`         | Interface for polymorphic ownership checks                       |
| `IRepository<T>`       | Generic repository abstraction (CRUD + predicate queries)        |
| `IUserRepository`      | Extended user queries (by username, email, with includes)        |
| `IFileMetadataRepository` | Extended file queries (by session, with chunks/permissions)   |
| `IFolderRepository`    | Folder queries with ownership filtering                          |
| `INotificationRepository` | Notification queries and batch mark-read operations           |
| `IActivityLogRepository` | Activity log queries per user                                  |

**Enums:** `UploadStatus` (Pending → InProgress → Complete/Failed/Cancelled), `PermissionType` (Read/Write/Owner), `SyncEventType` (Created/Modified/Deleted/Renamed), `NotificationType` (FileUploaded/FileShared/FileDeleted/SyncComplete/PermissionChanged/FileRestored), `StorageTier` (Hot/Warm/Cold/Archive)

### 2.2 Application Layer (`CloudStorage.Application`)

Defines business contracts, data transfer objects, and domain events.

**Core Service Interfaces:**

| Interface                     | Responsibility                                              |
| ----------------------------- | ----------------------------------------------------------- |
| `IAuthService`                | Registration, login, JWT tokens, password reset             |
| `IFileService`                | File CRUD, permission grants, search, version history, bulk operations |
| `IAdminService`               | Dashboard stats, user management, quota, health, audit, impersonation |
| `IChunkStorageService`        | Physical chunk I/O (save, get, delete, existence)           |
| `IDeduplicationService`       | Chunk registry with reference counting                      |
| `IRefreshTokenService`        | Refresh token lifecycle (generate, validate, revoke)        |
| `IFolderService`              | Folder CRUD, rename, move, share (nested file propagation)  |
| `IDeviceService`              | Device registration, last-sync timestamp, removal           |
| `IActivityService`            | Activity log retrieval per user                             |
| `IConflictDetectionService`   | Version-vector conflict check and resolution                |
| `IDeltaSyncService`           | Pull file changes since a given UTC timestamp               |
| `IBlobSasService`             | Generate Azure SAS tokens for parallel chunk downloads      |
| `INotificationPersistenceService` | Database storage and retrieval for user notifications    |
| `INotificationService`        | SignalR real-time push (file uploaded/deleted)              |
| `ICacheService`               | Distributed cache abstraction (Redis)                       |
| `IDistributedLockService`     | Redis-backed distributed locking                            |
| `IEmailService`               | Password-reset email dispatch                               |
| `IMessageQueue`               | RabbitMQ publish (chunk verification, cleanup tasks)        |
| `IEventPublisher`             | Domain event publishing                                     |
| `IAzureChunkVerificationService` | Background async chunk integrity verification            |

**Distributed Systems Interface Modules (29 submodules):**

| Module            | Key Interfaces                                                    |
| ----------------- | ----------------------------------------------------------------- |
| `Storage`         | `IObjectStorageProvider`, `IStorageProviderFactory`, `ICapabilityNegotiator` |
| `Replication`     | `IReplicationCoordinator`, `IReplicationProvider`                 |
| `Tiering`         | `IStorageTieringService`, `ILifecyclePolicyEngine`, `IStorageCostAnalyzer` |
| `Routing`         | `IStorageRoutingEngine`, `IProviderHealthService`, `IFailoverCoordinator` |
| `Security`        | `IEncryptionKeyService`, `IClientEncryptionService`, `IIntegrityVerifier`, `IKeyHierarchyManager` |
| `Consensus`       | `IConsensusService`, `ILeaderElectionService`                     |
| `Merkle`          | `IMerkleTreeService`, `IMerkleVerifier`                           |
| `Transactions`    | `ISagaOrchestrator` (distributed saga with compensating actions)  |
| `Upload`          | `IUploadOrchestrator`, `IUploadStrategy`                          |
| `Gateway`         | `IStorageGateway`, `IProtocolTranslator`                          |
| `Metadata`        | `IMetadataService`, `IMetadataPartitionManager`, `IMetadataRebalancer`, `IMetadataShardRouter` |
| `Namespace`       | `IGlobalNamespaceService`                                         |
| `Versioning`      | `IVersionGraphService`                                            |
| `Durability`      | `IErasureCodingEngine`, `IDurabilityScoreService`, `IAutomatedRepairService` |
| `DR`              | `IDisasterRecoveryService`                                        |
| `Chaos`           | `IChaosTestingService`                                            |
| `CDC`             | `IContentDefinedChunker`, `IChunkBoundaryDetector`, `IDeduplicationOptimizer` |
| `Billing`         | `IStorageBillingService`                                          |
| `Cost`            | `ICostOptimizationEngine`                                         |
| `Compliance`      | `IComplianceFramework`                                            |
| `Policy`          | `IPolicyEngine`                                                   |
| `Identity`        | `IIdentityFederationService`                                      |
| `Search`          | `ISearchService`, `IIndexingPipeline`                             |
| `SaaS`            | `ITenantService`, `ITenantIsolationProvider`                      |
| `Sla`             | `ISloMonitoringService`                                           |
| `Edge`            | `IEdgeDistributionService`                                        |
| `Fleet`           | `IFleetManager`                                                   |
| `Benchmarks`      | `IPerformanceBenchmarkService`                                    |
| `AI`              | `IStorageIntelligenceService`                                     |

**Domain Events (`Events/`):**

`ChunkUploadedEvent`, `FileAssembledEvent`, `FileVersionCreatedEvent`, `SyncConflictDetectedEvent`, `PermissionGrantedEvent`, `FileDeletedEvent`, `FileReplicatedEvent`, `ReplicationFailedEvent`, `ReplicationProgressEvent`, `StorageTierChangedEvent`, `ProviderHealthChangedEvent`, `ArchiveRestoreRequestedEvent`, `UploadStrategyChangedEvent`

**DTOs (12 files, 30+ records):**

- **Auth:** `RegisterDto`, `LoginDto`, `LoginResponseDto`, `RefreshTokenDto`, `PasswordResetRequestDto`, `PasswordResetDto`
- **Files:** `FileResponseDto`, `FileUploadDto`, `FilePermissionDto`, `FileListDto`, `DashboardStatsDto`, `StorageBreakdownDto`, `FileVersionDto`, `FilePermissionListDto`, `FileEventDto`
- **Chunks:** `InitiateUploadDto`, `UploadSessionResponseDto`, `ChunkUploadResponseDto`, `CompleteUploadDto`, `UploadStatusResponseDto`
- **Admin:** `AdminDashboardStatsDto`, `AdminUserManagementDto`, `AdminAuditDto`, `SystemHealthDetailsDto`, `ServiceCheckDto`, `CreateUserDto`, `UpdateQuotaDto`, `RegionalNodeDto`
- **Folders:** `FolderDto`, `CreateFolderDto`, `RenameFolderDto`, `MoveFolderDto`, `FolderShareDto`
- **Devices:** `DeviceDto`, `RegisterDeviceDto`
- **Sync:** `ConflictCheckRequestDto`, `ConflictCheckResponseDto`, `ConflictResolutionDto`, `DeltaSyncResponseDto`
- **Notifications:** `NotificationDto`, `ActivityLogDto`
- **Shared:** `ApiResponse<T>` (generic envelope: `success`, `message`, `data`)

### 2.3 Infrastructure Layer (`CloudStorage.Infrastructure`)

Implements all interfaces defined in Domain and Application. Contains 35+ submodules.

**Core Services (`Services/`):**

| Component               | Implementation Details                                       |
| ------------------------ | ----------------------------------------------------------- |
| `ApplicationDbContext`   | EF Core with Fluent API: unique indexes, cascade/restrict deletes, composite keys |
| `Repository<T>`         | Generic EF Core repository                                  |
| `UserRepository`        | Eager loading for Devices, RefreshTokens                    |
| `FileMetadataRepository`| Session-based lookup, permission checks with include chains |
| `AuthService`           | BCrypt password hashing, JWT generation (HS256), refresh token rotation |
| `FileService`           | File metadata CRUD with owner-based permission enforcement (partials: `.History.cs`, `.Operations.cs`) |
| `AdminService`          | System stats, user management, quota, health, audit, impersonation |
| `ChunkStorageService`   | Local filesystem chunk storage (`/app/storage/chunks/{fileId}/{index}.chunk`) |
| `BlobChunkStorageService` | S3-compatible (MinIO/Azure) chunk storage                  |
| `DeduplicationService`  | Hash-based ChunkRegistry with reference counting            |
| `RefreshTokenService`   | Cryptographic token generation, expiration, revocation      |
| `FolderService`         | Folder CRUD with nested permission propagation              |
| `DeviceService`         | Device registration and sync timestamp management          |
| `ConflictDetectionService` | Version-vector conflict detection and resolution          |
| `DeltaSyncService`      | Pull-based delta sync since UTC timestamp                   |
| `ActivityService`       | Activity log persistence per user                           |
| `NotificationPersistenceService` | Database-backed notification CRUD                   |
| `EmailService`          | SMTP email dispatch (Mailpit in dev)                        |
| `RabbitMqService`       | Message queue publish/subscribe for async tasks             |
| `RedisCacheService`     | Distributed cache with prefix-based invalidation            |
| `RedisDistributedLockService` | Distributed locking for concurrent operations          |
| `BlobSasService`        | Azure SAS token generation for parallel chunk downloads     |
| `MappingExtensions`     | Entity-to-DTO mapping helpers                               |

**Distributed Systems Modules:**

| Module          | Purpose                                                           |
| --------------- | ----------------------------------------------------------------- |
| `AI/`           | Storage intelligence and predictive optimization                  |
| `Replication/`  | Cross-provider data replication with retry and progress tracking   |
| `Tiering/`      | Hot/Warm/Cold/Archive lifecycle transitions                       |
| `Routing/`      | Provider health monitoring, failover coordination, routing engine  |
| `Security/`     | Encryption key management, client-side encryption, integrity      |
| `Consensus/`    | Leader election and consensus protocols                           |
| `Merkle/`       | Merkle tree construction and integrity verification               |
| `Transactions/` | Saga orchestrator with compensating actions                       |
| `Upload/`       | Adaptive upload orchestration and strategy selection               |
| `Gateway/`      | Protocol translation and unified storage gateway                  |
| `Metadata/`     | Metadata indexing, shard routing, partition management, rebalancing |
| `Providers/`    | Pluggable storage provider implementations                        |
| `Namespace/`    | Global namespace resolution                                       |
| `Versioning/`   | Version graph management                                          |
| `Durability/`   | Erasure coding engine, durability scoring, automated repair        |
| `DR/`           | Disaster recovery orchestration                                   |
| `Chaos/`        | Controlled fault injection for resilience testing                  |
| `CDC/`          | Content-defined chunking and deduplication optimization            |
| `Billing/`, `Cost/` | Usage metering and cost optimization                          |
| `Compliance/`   | Regulatory compliance framework                                   |
| `Policy/`       | Policy engine for storage rules                                   |
| `Identity/`     | Identity federation across providers                              |
| `Search/`       | Full-text search and indexing pipeline                            |
| `SaaS/`         | Multi-tenant isolation                                            |
| `Sla/`          | SLO monitoring and enforcement                                    |
| `Edge/`, `Fleet/` | Edge distribution and fleet management                          |
| `Resilience/`   | Resilience patterns (circuit breaker, retry, fallback)             |
| `Benchmarks/`, `Telemetry/` | Performance benchmarking and telemetry export          |

**Database Migrations:**
1. `InitialCreate` — Base schema (Users, Files, Chunks, Permissions, etc.)
2. `Phase2_DatabaseRefinement` — Index optimization, constraint refinements
3. `AddChunkingSupport` — ChunkRegistry, upload session fields

### 2.4 API Layer (`CloudStorage.API`)

RESTful API entry point with Swagger documentation. All controllers inherit from `BaseApiController` for shared infrastructure (`ExecuteAsync`, `GetUserId`).

| Controller              | Route Prefix         | Auth Required | Endpoints                                                    |
| ----------------------- | -------------------- | ------------- | ------------------------------------------------------------ |
| `AuthController`        | `api/auth`           | Partial       | register, login, refresh, logout, password-reset-request, password-reset |
| `FilesController`       | `api/files`          | Yes           | GET list/shared/search/stats, GET by ID, GET download, GET download-link, POST create, DELETE, DELETE all, POST permissions/share, PATCH rename/move, POST bulk-delete/move/share, GET versions, POST restore |
| `ChunkUploadController` | `api/files`          | Yes           | POST initiate, POST chunks (throttled), POST complete, GET session status |
| `FoldersController`     | `api/folders`        | Yes           | GET root, GET by ID, POST create, PATCH rename, PATCH move, DELETE, POST share |
| `TrashController`       | `api/trash`          | Yes           | GET trash, POST restore, DELETE permanent, DELETE empty-trash |
| `AdminController`       | `api/admin`          | Admin         | GET stats, GET/POST users, PATCH quota, POST toggle-status, GET health, GET audit, POST impersonate |
| `DevicesController`     | `api/devices`        | Yes           | GET list, POST register, PATCH sync timestamp, DELETE remove |
| `NotificationsController` | `api/notifications` | Yes           | GET list, PATCH mark read, POST read-all |
| `ActivityController`    | `api/activity`       | Yes           | GET recent activity (with `?limit`) |
| `DeltaSyncController`   | `api/sync/delta`     | Yes           | GET changes since UTC timestamp |
| `ConflictController`    | `api/sync`           | Yes           | POST check-conflicts, POST resolve |
| `HealthController`      | `health`             | No            | GET health (liveness), GET ready (DB readiness) |

**Middleware Pipeline:** HTTPS Redirect → CORS → Authentication → `UploadThrottlingMiddleware` → Authorization → Rate Limiting → Controllers

---

## 3. Data Flow

### 3.1 Authentication Flow

```
Client                      API                      Infrastructure
  │                          │                              │
  ├─ POST /api/auth/login ──>│                              │
  │                          ├─ AuthService.LoginAsync() ──>│
  │                          │                              ├─ BCrypt.Verify()
  │                          │                              ├─ GenerateJwtToken()
  │                          │                              ├─ GenerateRefreshToken()
  │                          │<── LoginResponseDto ─────────┤
  │<── { accessToken,        │                              │
  │      refreshToken }      │                              │
```

- **Access Token:** JWT with HS256, 15-minute expiry, claims: sub, jti, email, id
- **Refresh Token:** 64-byte cryptographic random, 7-day expiry, stored in DB
- **Token Rotation:** On refresh, old token is revoked, new pair is issued

### 3.2 Chunked Upload Flow

```
Client                      API                      Infrastructure
  │                          │                              │
  ├─ POST /api/files/initiate ─>│                           │
  │                          ├─ Create FileMetadata ───────>│
  │<── { sessionId, fileId } │                              │
  │                          │                              │
  ├─ POST /api/files/chunks ─>│  (repeated per chunk)       │
  │   [FormData: chunk,      │                              │
  │    sessionId, index,     ├─ DeduplicationService ──────>│
  │    hash]                 │   └─ IsChunkDuplicate?        │
  │                          │       ├─ Yes: reuse path      │
  │                          │       └─ No:  save + register │
  │                          ├─ ChunkStorageService ───────>│
  │                          │   └─ SaveChunkAsync()         │
  │<── { chunkId, status }   │                              │
  │                          │                              │
  ├─ POST /api/files/complete ─>│                           │
  │                          ├─ Validate chunk count ──────>│
  │                          ├─ Status = Complete           │
  │<── { fileId, metadata }  │                              │
```

- **Chunk Size:** 5 MB (configurable on client)
- **Deduplication:** SHA-256 hash comparison via `ChunkRegistry`
- **Resumability:** Client queries `GET /session/{id}/status` for uploaded chunk indices

---

## 4. Entity Relationship Model

```
┌──────────┐     1:N     ┌──────────────┐     1:N     ┌───────────────┐
│   User   │────────────>│ RefreshToken  │             │    Device     │
│   (PK)   │<──Cascade───│              │             │               │
│          │──────────────────────────────────────────>│               │
│          │     1:N     ┌──────────────┐   Cascade    └───────────────┘
│          │────────────>│FilePermission│                     │
│          │  Restrict   │              │                     │ Restrict
│          │             └───────┬──────┘                     │
└──────────┘                    │ Cascade               ┌────▼────────┐
                                │                       │  SyncEvent  │
                         ┌──────▼──────┐                │             │
                         │FileMetadata │←───Cascade──────┤             │
                         │             │                └─────────────┘
                         │ UploadStatus│     1:N
                         │ Version     │────────────>┌──────────────┐
                         │ SessionId   │   Cascade   │  FileChunk   │
                         └─────────────┘             │  Hash-based  │
                                                     │  Dedup       │
                                                     └──────┬───────┘
                                                            │ references
                                                     ┌──────▼───────┐
                                                     │ChunkRegistry │
                                                     │  PK: Hash    │
                                                     │  RefCount    │
                                                     └──────────────┘
```

**Key Relationships:**
- `User → RefreshToken`: Cascade delete (user deletion removes all tokens)
- `User → Device`: Cascade delete
- `FileMetadata → FileChunk`: Cascade delete
- `FileMetadata → FilePermission`: Cascade delete
- `FileMetadata → User (Owner)`: **Restrict** delete (cannot delete user with owned files)
- `SyncEvent → Device`: **Restrict** delete (preserves sync history)
- `FilePermission → User`: **Restrict** delete (preserves access records)

---

## 5. Infrastructure & Deployment

### 5.1 Docker Compose Services

| Service                | Image                             | Port Mapping   | Purpose                        |
| ---------------------- | --------------------------------- | -------------- | ------------------------------ |
| `nginx`                | nginx:alpine                      | 8000:80        | **Load Balancer & Entry Point**|
| `cloudstorage.api`     | Custom (.NET 10 SDK)              | Replicas (x3)  | REST API cluster (scaled)      |
| `cloudstorage.client`  | Custom (Angular 21)               | 4200:80        | Frontend SPA                   |
| `postgres`             | postgres:16-alpine                | 5433:5432      | Metadata database & Pools      |
| `redis`                | redis:7-alpine                    | 6379:6379      | Cache / SignalR Backplane      |
| `minio`                | minio/minio:latest                | 9000, 9001     | S3-compatible object storage   |
| `rabbitmq`             | rabbitmq:3-management-alpine      | 5672, 15672    | Background Message Broker      |
| `prometheus`           | prom/prometheus:latest            | 9090:9090      | Scrapes telemetry from API     |
| `grafana`              | grafana/grafana:latest            | 3000:3000      | Visualization dashboard        |
| `otel-collector`       | otel/opentelemetry-collector-contrib | 4317, 4318  | OpenTelemetry collector hub    |
| `jaeger`               | jaegertracing/all-in-one:latest   | 16686          | Distributed tracing UI         |
| `loki`                 | grafana/loki:latest               | 3100:3100      | Log aggregation backend        |
| `mailpit`              | axllent/mailpit:latest            | 8025, 1025     | Email capture (dev SMTP)       |

### 5.2 API Dockerfile (Multi-stage)

```
Stage 1 (base):    mcr.microsoft.com/dotnet/aspnet:10.0 → Exposes 8080, 8081
Stage 2 (build):   mcr.microsoft.com/dotnet/sdk:10.0   → Restore, build
Stage 3 (publish): Publish with UseAppHost=false
Stage 4 (final):   Copy publish output, ENTRYPOINT dotnet CloudStorage.API.dll
```

### 5.3 Client Dockerfile (Multi-stage)

```
Stage 1: node:22-alpine → npm ci, npm run build --production
Stage 2: nginx:alpine   → Serve SPA with custom nginx.conf
```

### 5.4 Health Checks

- **API:** `GET /health` (liveness), `GET /health/ready` (readiness with DB check)
- **PostgreSQL:** `pg_isready -U postgres` (10s interval)
- **Redis:** `redis-cli ping` (10s interval)

---

## 6. Frontend Architecture (Angular 21)

```
CloudStorage.Client/src/
├── app/
│   ├── core/                            # Singleton Services & State management
│   │   ├── services/                    # Api, Auth, File, Folder, Sync, Notification, Layout
│   │   ├── guards/                      # AuthGuard
│   │   ├── interceptors/                # AuthInterceptor, ErrorInterceptor
│   │   ├── layout/                      # Sidebar, Topbar, AppShell, AuthLayout
│   │   └── models/                      # BaseComponent, BaseService, interfaces
│   ├── shared/                          # Reusable components and directives
│   │   ├── components/                  # ContextMenu, Modal, SkeletonLoader, SyncStatus, etc.
│   │   └── directives/                  # DragDropDirective, IntersectionObserver
│   ├── features/                        # Lazy-loaded feature modules (16+ features)
│   │   ├── admin/                       # SystemMetrics, UsageAnalytics
│   │   ├── auth/                        # Login, Register, SessionExpired
│   │   ├── dashboard/                   # Dashboard, FileList
│   │   ├── files/                       # FilePreview, FolderView, Trash, Recent, VersionCompare
│   │   ├── search/                      # SearchResults
│   │   ├── sync/                        # ConflictCenter, SyncHistory
│   │   ├── settings/                    # Profile, Security, Storage, Encryption, Danger Zone
│   │   ├── activity/                    # ActivityLog, AuditLog
│   │   └── devices/                     # Device management
│   ├── app.config.ts                    # Application providers
│   ├── app.routes.ts                    # Route definitions
│   └── app.component.ts                 # Root component
├── main.ts                              # Bootstrap
└── test-setup.ts                        # Vitest configuration
```

**Key Features:**
- **Chunking:** SHA-256 hashing via Web Crypto API, 5 MB chunk size
- **Upload Manager:** Queue-based with configurable concurrency (default: 3), pause/resume/cancel
- **Retry Logic:** Exponential backoff (1s, 2s, 4s) with 3 max retries
- **Offline-First:** `OfflineCacheService` (IndexedDB) + `ConnectionStatusService` + `SyncEngineService` for delta sync and conflict resolution on reconnect
- **Real-Time Events:** `SignalRService` subscribes to `fileUploaded`, `fileDeleted`, `allFilesDeleted` events
- **Standalone Components:** All components are standalone (Angular 21 pattern)
- **Testing:** Vitest 4.x with jsdom environment

---

## 7. Testing Architecture

```
tests/
├── Builders/                             # Shared fluent entity builders
├── Seeders/                              # Shared test data seeders
├── CloudStorage.Domain.Tests/            # Entity validations, relationship tests
│   ├── Entities/                         # 9 entity test files (incl. UncoveredEntitiesTests)
│   └── Relationships/                    # EntityRelationshipTests.cs
├── CloudStorage.Application.Tests/       # Service + model tests
│   ├── ArchitectureTests.cs              # Layer dependency enforcement
│   └── Services/                         # 12 test files: Auth, File, RefreshToken, Activity,
│                                         #   DeltaSync, BlobChunk, ApplicationModel (DTOs,
│                                         #   Events, ExtendedRecords, ApiResponse)
├── CloudStorage.Infrastructure.Tests/    # Repository + service + distributed system tests
│   ├── Repositories/                     # FileMetadata, User repository tests
│   └── Services/                         # 20 test files: Core services + CloudStorageProvider,
│                                         #   HyperscaleOrchestration (Consensus, Security),
│                                         #   OrchestrationSystems (ProviderHealth, Tiering, Upload),
│                                         #   ProductionGrade tests
└── CloudStorage.API.Tests/               # Controller + integration tests
    ├── Builders/                          # API-specific test builders
    ├── Fixtures/                          # TestDatabaseFixture, WebApplicationFactory, BaseIntegrationTest
    ├── Helpers/                           # JwtTokenHelper
    ├── Controllers/                       # Auth, ChunkUpload, Conflict, DeltaSync, Files, Health
    ├── Integration/                       # Auth + Files integration tests
    ├── Services/                          # SignalR notification tests
    └── Seeders/                           # API test data seeders
```

**Frontend Tests:** Located alongside source files using `*.spec.ts` convention, run with Vitest.
**E2E Tests:** Persona-based Playwright tests in `CloudStorage.Client/e2e/personas/` (Admin, User, Guest, Resilience, Performance, Accessibility).

---

## 8. Security Architecture

| Layer          | Mechanism                                                  |
| -------------- | ---------------------------------------------------------- |
| Transport      | HTTPS redirection enforced in middleware                   |
| Authentication | JWT Bearer (HS256) with configurable expiry                |
| Authorization  | `[Authorize]` attribute on protected controllers           |
| Passwords      | BCrypt hashing (cost factor via BCrypt.Net)                |
| Token Security | Cryptographic random refresh tokens, revocation on rotate  |
| Access Control | Owner-based permissions with Read/Write/Owner granularity  |
| CORS           | Configurable allowed origins (default: `localhost:4200`)   |
| Secrets        | Environment variables in Compose / Kubernetes Secrets      |
| CSP & Headers  | Content-Security-Policy (no unsafe-inline), secure headers |

---

## 9. Configuration Management

| Setting                       | Source File                | Default Value              |
| ----------------------------- | ------------------------- | -------------------------- |
| Database Connection           | `appsettings.json`        | PostgreSQL on localhost    |
| JWT Key/Issuer/Audience       | `appsettings.json`        | Configurable per env       |
| JWT Expiration                | `appsettings.json`        | 15 minutes                 |
| Refresh Token Expiration      | `appsettings.json`        | 7 days                     |
| Max File Size                 | `appsettings.json`        | 50 GB                      |
| Chunk Storage Path            | `appsettings.json`        | `/app/storage/chunks`      |
| Allowed Origins               | `appsettings.json`        | `localhost:4200`, `localhost:3000` |
| Docker Environment Overrides  | `docker-compose.yml`      | Overrides for containerized deployment |

---

## 10. Observability & Monitoring

The platform includes comprehensive telemetry collection:
- **Metrics**: Scraped by Prometheus from the API's `/metrics` and `/health` endpoints and exported via OpenTelemetry.
- **Logs**: Structured logs generated by `ILogger` are exported via OTLP to Loki and also output to the console in detailed format.
- **Traces**: Distributed tracing maps API requests, Entity Framework Core queries, Redis caching requests, and incoming HTTP requests, exporting traces via OTLP to Jaeger.
- **Grafana**: Pre-configured dashboards display live system metrics, log feeds, and trace timelines in a unified observability interface.
