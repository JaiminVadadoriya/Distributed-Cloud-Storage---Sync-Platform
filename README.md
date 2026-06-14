# ☁️ Distributed Cloud Storage & Sync Platform

A scalable, distributed cloud storage and synchronization platform built with **.NET 10** and **Angular 21**, following **Clean Architecture** principles. Designed to handle large files (up to 50 GB), support offline operations, and provide real-time synchronization.

---

## ✨ Features

- **Chunked Uploads** — Files are split into 5 MB chunks with SHA-256 hashing for integrity
- **Deduplication** — Identical chunks are stored once and reference-counted
- **Version History** — Maintain multiple versions of files with restore capabilities
- **Bulk Operations** — Delete, move, and share multiple files/folders at once
- **Trash / Recycle Bin** — Soft-delete with restore and permanent-delete via dedicated `TrashController`
- **Notification Persistence** — Database-backed activity log and real-time toast alerts
- **Comprehensive File System UI** — Trash, Recent files, multi-select operations, and File Preview (Image/Video/PDF/Text)
- **Advanced Sync & Conflict Resolution** — Dedicated Sync History timeline and Conflict Center for resolving Version Vector mismatches
- **Admin Control Plane** — Role-based admin dashboard with user management, quota control, system health, audit logs, and user impersonation
- **Horizontal Scaling** — API scaled to **3 replicas** with **NGINX** reverse-proxy load balancing
- **Distributed Caching** — **Redis** for metadata, permissions, and SignalR backplane
- **Async Background Tasks** — **RabbitMQ** + **BackgroundWorkerService** for offloading dedup/integrity checks
- **HTTP/2 & Compression** — Optimized network transfers with Gzip and multiplexed connections
- **Zero-Trust Security & CSP** — Strict Content-Security-Policy (CSP) headers without `unsafe-inline` scripts, secure container privileges, and separate Kubernetes Secret credentials
- **Observability (Traces, Metrics, Logs)** — Full OpenTelemetry pipeline: **OTel Collector** receives telemetry, exports to **Loki** (logs), **Prometheus** (metrics), and **Jaeger** (traces), all visualized in **Grafana**
- **Supply Chain Security** — Pinned GitHub Actions commit SHAs, **Trivy** IaC/configuration vulnerability scanning, and CycloneDX/SPDX **SBOM** generation
- **Email Testing** — **Mailpit** local SMTP server captures all outbound emails (password resets) during development
- **Object Storage** — **MinIO** (S3-compatible) for chunk storage in development; pluggable via `IObjectStorageProvider` for Azure/AWS/GCS
- **Upload Throttling** — `UploadThrottlingMiddleware` limits each user to 5 concurrent chunk uploads (Redis-backed)
- **Distributed Systems Modules** — Multi-provider storage routing, cross-region replication, storage tiering (Hot/Warm/Cold/Archive), Merkle tree verification, Saga-based distributed transactions, consensus/leader election, erasure coding, chaos testing, and more
- **Cloud-Ready** — Kubernetes manifests with HPA support and Docker Compose orchestration
- **Comprehensive Tests** — Unit tests across all 4 backend layers + Playwright E2E + k6 load tests + architecture tests

---

## 🏗️ Architecture

This project follows **Clean Architecture** with strict layer separation:

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                               │
│   Controllers · Swagger · JWT Middleware · CORS                 │
├─────────────────────────────────────────────────────────────────┤
│                      Application Layer                          │
│   Service Interfaces · DTOs · Business Contracts                │
├─────────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                          │
│   EF Core DbContext · Repositories · Services · Migrations      │
├─────────────────────────────────────────────────────────────────┤
│                       Domain Layer                              │
│   Entities · Enums · Repository Interfaces (zero dependencies)  │
└─────────────────────────────────────────────────────────────────┘
```

> 📖 Full documentation: [**Architecture**](docs/ARCHITECTURE.md) &nbsp;|&nbsp; [**Design**](docs/DESIGN.md)

---

## 🛠️ Tech Stack

| Layer              | Technology                                  |
| ------------------ | ------------------------------------------- |
| **Backend**        | .NET 10 Web API (C#)                        |
| **Frontend**       | Angular 21, **Tailwind CSS v4**, **Material v20** |
| **Database**       | PostgreSQL 16 (EF Core)                     |
| **Cache**          | Redis 7 (Distributed Cache & Backplane)     |
| **Message Queue**  | RabbitMQ 3 (Background Processing)          |
| **Object Storage** | MinIO (S3-compatible, dev) / Azure Blob     |
| **Load Balancer**  | NGINX (Reverse Proxy, Compression)          |
| **Observability**  | OTel Collector → Prometheus + Loki + Jaeger + Grafana |
| **Testing**        | xUnit, Moq, Vitest, Playwright, **k6** (Load Testing) |

---

## 📂 Project Structure

```
cloud-storage/
├── CloudStorage.API/                    # Entry point & controllers
│   ├── Controllers/
│   │   ├── BaseApiController.cs         #   Shared controller infrastructure (ExecuteAsync, GetUserId)
│   │   ├── AuthController.cs            #   Registration, login, token refresh, password reset
│   │   ├── FilesController.cs           #   File CRUD, search, download, permissions, stats
│   │   ├── ChunkUploadController.cs     #   Chunked upload workflow
│   │   ├── FoldersController.cs         #   Folder CRUD, rename, move, share
│   │   ├── TrashController.cs           #   Trash/Recycle bin: restore, permanent delete, empty trash
│   │   ├── AdminController.cs           #   Admin-only: stats, users, quota, health, audit, impersonation
│   │   ├── DevicesController.cs         #   Device registration & sync tracking
│   │   ├── NotificationsController.cs   #   Unread notifications, mark-read
│   │   ├── ActivityController.cs        #   Activity feed
│   │   ├── DeltaSyncController.cs       #   Delta sync (changes since timestamp)
│   │   ├── ConflictController.cs        #   Conflict check & resolution
│   │   └── HealthController.cs          #   Liveness & readiness probes
│   ├── Services/
│   │   └── UploadThrottlingMiddleware.cs #   Max 5 concurrent chunk uploads per user (Redis)
│   ├── Program.cs                       #   DI, middleware, pipeline config
│   ├── Dockerfile                       #   Multi-stage .NET build
│   └── appsettings.json                 #   Configuration (JWT, DB, CORS)
│
├── CloudStorage.Application/            # Business contracts
│   ├── DTOs/                            #   UserDtos, FileDtos, ChunkUploadDtos, AdminDtos,
│   │                                    #   FolderDtos, DeviceDtos, ConflictDtos, NotificationDtos
│   ├── Events/                          #   Domain events (ChunkUploaded, FileAssembled,
│   │                                    #   FileReplicated, StorageTierChanged, etc.)
│   └── Interfaces/                      #   Core: IAuthService, IFileService, IFolderService, etc.
│       ├── AI/                          #   IStorageIntelligenceService
│       ├── Replication/                 #   IReplicationCoordinator, IReplicationProvider
│       ├── Storage/                     #   IObjectStorageProvider, IStorageProviderFactory
│       ├── Tiering/                     #   IStorageTieringService, ILifecyclePolicyEngine
│       ├── Security/                    #   IEncryptionKeyService, IIntegrityVerifier
│       ├── Routing/                     #   IStorageRoutingEngine, IProviderHealthService
│       ├── Consensus/                   #   IConsensusService, ILeaderElectionService
│       ├── Merkle/                      #   IMerkleTreeService, IMerkleVerifier
│       ├── Transactions/                #   ISagaOrchestrator (distributed sagas)
│       ├── Metadata/                    #   IMetadataService, IMetadataPartitionManager
│       ├── Upload/                      #   IUploadOrchestrator, IUploadStrategy
│       ├── Gateway/                     #   IStorageGateway, IProtocolTranslator
│       ├── Namespace/                   #   IGlobalNamespaceService
│       ├── Versioning/                  #   IVersionGraphService
│       ├── Durability/                  #   IErasureCodingEngine, IDurabilityScoreService
│       ├── DR/                          #   IDisasterRecoveryService
│       ├── Chaos/                       #   IChaosTestingService
│       ├── CDC/                         #   IContentDefinedChunker, IDeduplicationOptimizer
│       ├── Billing/                     #   IStorageBillingService
│       ├── Cost/                        #   ICostOptimizationEngine
│       ├── Compliance/                  #   IComplianceFramework
│       ├── Policy/                      #   IPolicyEngine
│       ├── Identity/                    #   IIdentityFederationService
│       ├── Search/                      #   ISearchService, IIndexingPipeline
│       ├── SaaS/                        #   ITenantService, ITenantIsolationProvider
│       ├── Sla/                         #   ISloMonitoringService
│       ├── Edge/                        #   IEdgeDistributionService
│       ├── Fleet/                       #   IFleetManager
│       └── Benchmarks/                  #   IPerformanceBenchmarkService
│
├── CloudStorage.Domain/                 # Core entities (zero dependencies)
│   ├── Entities/                        #   User, FileMetadata, FileChunk, Folder, Device,
│   │                                    #   SyncEvent, ActivityLog, Notification, FilePermission,
│   │                                    #   FolderPermission, PermissionBase, ChunkRegistry,
│   │                                    #   RefreshToken, PasswordResetToken, BaseEntity,
│   │                                    #   BaseAuditableEntity, IOwnedEntity,
│   │                                    #   StorageObjectLifecycle, DbObjectMetadata
│   ├── Enums/                           #   UploadStatus, PermissionType, SyncEventType,
│   │                                    #   NotificationType, StorageTier
│   └── Interfaces/                      #   IRepository<T>, IUserRepository,
│                                        #   IFileMetadataRepository, IFolderRepository,
│                                        #   INotificationRepository, IActivityLogRepository
│
├── CloudStorage.Infrastructure/         # Implementations
│   ├── Data/ApplicationDbContext.cs     #   EF Core with Fluent API
│   ├── Repositories/                    #   Generic & specialized repos
│   ├── Services/                        #   Auth, File (+ History, Operations partials),
│   │                                    #   Chunk, Dedup, Token, Folder, Device, Activity,
│   │                                    #   DeltaSync, Conflict, Admin, Email, Notification,
│   │                                    #   RabbitMq, Redis Cache/Lock, BlobSas, BlobChunkStorage
│   ├── AI/                              #   Storage intelligence
│   ├── Replication/                     #   Cross-provider replication
│   ├── Tiering/                         #   Hot/Warm/Cold/Archive lifecycle
│   ├── Security/                        #   Encryption, key hierarchy, integrity
│   ├── Routing/                         #   Provider health, failover, routing engine
│   ├── Consensus/                       #   Leader election, consensus
│   ├── Merkle/                          #   Merkle tree construction & verification
│   ├── Transactions/                    #   Saga orchestrator
│   ├── Metadata/                        #   Metadata indexing, sharding, rebalancing
│   ├── Upload/                          #   Upload orchestration & adaptive strategy
│   ├── Gateway/                         #   Protocol translation, storage gateway
│   ├── Providers/                       #   Storage provider implementations
│   ├── Namespace/                       #   Global namespace
│   ├── Versioning/                      #   Version graph
│   ├── Durability/                      #   Erasure coding, auto-repair
│   ├── DR/                              #   Disaster recovery
│   ├── Chaos/                           #   Chaos testing
│   ├── CDC/                             #   Content-defined chunking
│   ├── Billing/, Cost/                  #   Usage billing & cost optimization
│   ├── Compliance/                      #   Regulatory compliance
│   ├── Policy/                          #   Policy engine
│   ├── Identity/                        #   Identity federation
│   ├── Search/                          #   Full-text search, indexing
│   ├── SaaS/                            #   Multi-tenant isolation
│   ├── Sla/                             #   SLO monitoring
│   ├── Edge/, Fleet/                    #   Edge distribution, fleet management
│   ├── Resilience/                      #   Resilience patterns
│   ├── Benchmarks/, Telemetry/          #   Performance benchmarks, telemetry
│   └── Migrations/                      #   EF Core migrations
│
├── CloudStorage.Client/                 # Angular 21 frontend
│   ├── src/app/
│   │   ├── core/                        #   Auth, API, SignalR, Sync-Engine, Services
│   │   │   ├── services/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── layout/                  #   Sidebar, Topbar, AppShell, AuthLayout
│   │   │   └── models/                  #   BaseComponent, BaseService, Data Models
│   │   ├── shared/                      #   Common components (Toast, Modal, Dialogs, ContextMenu)
│   │   ├── features/                    #   9 Feature Modules
│   │   │   ├── admin/                   #   System Metrics, Usage Analytics
│   │   │   ├── auth/                    #   Login, Register, Session Expired
│   │   │   ├── dashboard/               #   Dashboard, FileList
│   │   │   ├── files/                   #   FileExplorer, Preview, Trash, Recent, VersionCompare
│   │   │   ├── search/                  #   Enhanced Search Results w/ Filters
│   │   │   ├── sync/                    #   Conflict Center, Sync History
│   │   │   ├── settings/                #   Profile, Security, Storage, Encryption, Danger Zone
│   │   │   ├── devices/                 #   Device management
│   │   │   └── activity/                #   Activity Log, Audit Log
│   │   ├── app.config.ts                #   Application providers
│   │   ├── app.routes.ts                #   Route definitions
│   │   └── app.component.ts             #   Root component
│   ├── Dockerfile                       #   Node 22 → Nginx SPA
│   └── nginx.conf                       #   SPA routing config
│
├── monitoring/                          # Observability Config
│   ├── prometheus.yml                   #   Metric scrape config
│   ├── otel-collector-config.yaml       #   OpenTelemetry Collector pipeline
│   └── grafana/                         #   Provisioning & pre-built dashboards
│
├── k8s/                                 # Kubernetes Manifests
│   ├── api-deployment.yaml              #   HPA, Replicas, Requests/Limits
│   └── ingress-nginx.yaml               #   Ingress & WebSocket annotations
│
├── nginx/                               # Load Balancer Config
│   └── nginx.conf                       #   Load balancing & compression
│
├── tests/                               # Test Projects
│   ├── Builders/                        #   Shared fluent entity builders
│   ├── Seeders/                         #   Shared test data seeders
│   ├── CloudStorage.Domain.Tests/       #   Entity validations, relationships
│   ├── CloudStorage.Application.Tests/  #   Service logic, DTOs, events, architecture
│   ├── CloudStorage.Infrastructure.Tests/ # Repository, service, orchestration, provider tests
│   ├── CloudStorage.API.Tests/          #   Controller, integration, SignalR tests
│   └── load/                            #   **k6** Stress test scripts (12k CCU)
│
├── docker-compose.yml                   # Full orchestration (14 services)
├── docker-compose.test.yml              # Isolated test environment
├── masterplan.md                        # Project roadmap & phases
└── CloudStorage.sln                     # .NET solution file
```

---

## 🏁 Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/cloud-storage.git
cd cloud-storage

# Start all services
docker-compose up --build
```

| Service            | URL                                       | Notes |
| ------------------ | ----------------------------------------- | ----- |
| API (via NGINX LB) | http://localhost:8000                     | 3 API replicas behind NGINX |
| Frontend (Angular) | http://localhost:4200                     | Served by Nginx SPA container |
| Swagger            | http://localhost:8000/swagger             | OpenAPI UI via LB |
| Grafana            | http://localhost:3000 (admin/admin)       | Pre-built API dashboards |
| Prometheus         | http://localhost:9090                     | Metrics scraping |
| Loki               | http://localhost:3100                     | Log collection backend |
| Jaeger             | http://localhost:16686                    | Distributed tracing UI |
| OTel Collector     | localhost:4317 / :4318                    | OpenTelemetry gRPC/HTTP receiver |
| RabbitMQ UI        | http://localhost:15672 (guest/guest)      | Management console |
| Mailpit (Email)    | http://localhost:8025                     | Captures all outbound emails |
| MinIO Console      | http://localhost:9001 (minioadmin/minioadmin) | S3-compatible object storage UI |
| MinIO API          | http://localhost:9000                     | S3 endpoint for chunk storage |
| PostgreSQL         | localhost:5433                            | External port (internal 5432) |
| Redis              | localhost:6379                            | Cache & SignalR backplane |

### Option 2: Manual Setup

```bash
# 1. Start PostgreSQL (ensure it's running on port 5432)
#    Update connection string in CloudStorage.API/appsettings.json if needed

# 2. Apply database migrations
dotnet ef database update --project CloudStorage.Infrastructure --startup-project CloudStorage.API

# 3. Run the API
dotnet run --project CloudStorage.API

# 4. Run the Angular client (in a separate terminal)
cd CloudStorage.Client
npm install
npm start
```

---

## 🔌 API Reference

### Authentication

| Endpoint                              | Method | Auth | Description                    |
| ------------------------------------- | ------ | ---- | ------------------------------ |
| `POST /api/auth/register`             | POST   | No   | Create a new user account      |
| `POST /api/auth/login`                | POST   | No   | Login and receive JWT tokens   |
| `POST /api/auth/refresh`              | POST   | No   | Refresh expired access token   |
| `POST /api/auth/logout`               | POST   | Yes  | Revoke refresh token           |
| `POST /api/auth/password-reset-request` | POST | No  | Request password reset email   |
| `POST /api/auth/password-reset`       | POST   | No   | Reset password with token      |

### File Management

| Endpoint                               | Method | Auth | Description                    |
| -------------------------------------- | ------ | ---- | ------------------------------ |
| `GET /api/files`                       | GET    | Yes  | List owned + shared files      |
| `GET /api/files/stats`                 | GET    | Yes  | Dashboard stats                |
| `GET /api/files/shared`                | GET    | Yes  | Files shared with current user |
| `GET /api/files/search?q=`             | GET    | Yes  | Search files by name           |
| `GET /api/files/{id}`                  | GET    | Yes  | Get file details               |
| `GET /api/files/{id}/download`         | GET    | Yes  | Stream file (HTTP Range supported) |
| `GET /api/files/{id}/download-link`    | GET    | Yes  | SAS URLs for parallel download |
| `POST /api/files`                      | POST   | Yes  | Create file metadata           |
| `POST /api/files/{id}/permissions`     | POST   | Yes  | Grant file permissions         |
| `POST /api/files/{id}/share`           | POST   | Yes  | Share file (alias for permissions) |
| `GET /api/files/{id}/versions`         | GET    | Yes  | Get file version history       |
| `POST /api/files/{id}/restore/{vId}`   | POST   | Yes  | Restore specific file version  |
| `PATCH /api/files/{id}/rename`         | PATCH  | Yes  | Rename a file                  |
| `PATCH /api/files/{id}/move`           | PATCH  | Yes  | Move file to folder            |
| `POST /api/files/bulk-delete`          | POST   | Yes  | Delete multiple files          |
| `POST /api/files/bulk-move`            | POST   | Yes  | Move multiple files            |
| `POST /api/files/bulk-share`           | POST   | Yes  | Share multiple files           |
| `DELETE /api/files/{id}`               | DELETE | Yes  | Soft delete a file             |
| `DELETE /api/files/all`                | DELETE | Yes  | Delete all owned files         |

### Trash / Recycle Bin

| Endpoint                             | Method | Auth | Description                 |
| ------------------------------------ | ------ | ---- | --------------------------- |
| `GET /api/trash`                     | GET    | Yes  | List soft-deleted files     |
| `POST /api/trash/{id}/restore`       | POST   | Yes  | Restore a file from trash   |
| `DELETE /api/trash/{id}`             | DELETE | Yes  | Permanently delete a file   |
| `DELETE /api/trash/empty`            | DELETE | Yes  | Empty entire trash bin      |

### Admin (Role: Admin)

| Endpoint                                | Method | Auth   | Description                    |
| --------------------------------------- | ------ | ------ | ------------------------------ |
| `GET /api/admin/stats`                  | GET    | Admin  | System dashboard statistics    |
| `GET /api/admin/users`                  | GET    | Admin  | List all users                 |
| `POST /api/admin/users`                 | POST   | Admin  | Provision a new user           |
| `PATCH /api/admin/users/{id}/quota`     | PATCH  | Admin  | Update user storage quota      |
| `POST /api/admin/users/{id}/toggle-status` | POST | Admin | Enable/disable user account    |
| `GET /api/admin/health`                 | GET    | Admin  | Detailed system health report  |
| `GET /api/admin/audit?count=50`         | GET    | Admin  | Recent audit log entries       |
| `POST /api/admin/users/{id}/impersonate`| POST   | Admin  | Generate impersonation token   |

### Chunked Upload

| Endpoint                             | Method | Auth | Description                 |
| ------------------------------------ | ------ | ---- | --------------------------- |
| `POST /api/files/initiate`           | POST   | Yes  | Start upload session        |
| `POST /api/files/chunks`             | POST   | Yes  | Upload a single chunk (throttled, max 5 concurrent) |
| `POST /api/files/complete`           | POST   | Yes  | Finalize upload             |
| `GET /api/files/session/{id}/status` | GET    | Yes  | Check upload progress       |

### Folders

| Endpoint                          | Method | Auth | Description                         |
| --------------------------------- | ------ | ---- | ----------------------------------- |
| `GET /api/folders/root`           | GET    | Yes  | List root-level folders             |
| `GET /api/folders/{id}`           | GET    | Yes  | Get folder by ID                    |
| `POST /api/folders`               | POST   | Yes  | Create folder                       |
| `PATCH /api/folders/{id}/rename`  | PATCH  | Yes  | Rename folder                       |
| `PATCH /api/folders/{id}/move`    | PATCH  | Yes  | Move folder to new parent           |
| `DELETE /api/folders/{id}`        | DELETE | Yes  | Delete folder (cascades)            |
| `POST /api/folders/{id}/share`    | POST   | Yes  | Share folder with user              |

### Devices

| Endpoint                          | Method | Auth | Description                         |
| --------------------------------- | ------ | ---- | ----------------------------------- |
| `GET /api/devices`                | GET    | Yes  | List registered devices             |
| `POST /api/devices`               | POST   | Yes  | Register a new device               |
| `PATCH /api/devices/{id}/sync`    | PATCH  | Yes  | Update last-sync timestamp          |
| `DELETE /api/devices/{id}`        | DELETE | Yes  | Remove a device                     |

### Notifications & Activity
| Endpoint                          | Method | Auth | Description                         |
| --------------------------------- | ------ | ---- | ----------------------------------- |
| `GET /api/notifications`          | GET    | Yes  | Get unread notifications            |
| `PATCH /api/notifications/{id}/read` | PATCH | Yes | Mark single notification as read    |
| `POST /api/notifications/read-all` | POST   | Yes  | Mark all as read                    |
| `GET /api/activity?limit=50`      | GET    | Yes  | Recent activity log (default: 50)   |

### Sync

| Endpoint                            | Method | Auth | Description                         |
| ----------------------------------- | ------ | ---- | ----------------------------------- |
| `GET /api/sync/delta?sinceUtc=`     | GET    | Yes  | Changes since UTC timestamp         |
| `POST /api/sync/check-conflicts`    | POST   | Yes  | Check version vector conflict       |
| `POST /api/sync/resolve`            | POST   | Yes  | Resolve conflict (KeepLocal/Server) |

### Health

| Endpoint             | Method | Auth | Description                        |
| -------------------- | ------ | ---- | ---------------------------------- |
| `GET /health`        | GET    | No   | Liveness check                     |
| `GET /health/ready`  | GET    | No   | Readiness check (DB connectivity)  |

---

## 🧪 Testing

### Backend Tests

```bash
# Run all backend tests
dotnet test

# Run a specific test project
dotnet test tests/CloudStorage.Domain.Tests
dotnet test tests/CloudStorage.Application.Tests
dotnet test tests/CloudStorage.Infrastructure.Tests
dotnet test tests/CloudStorage.API.Tests
```

### Frontend Tests

```bash
cd CloudStorage.Client
npm test
```

**Test Coverage:**
- **Domain:** Entity validations, default values, relationships, cascade behavior (9 test files)
- **Application:** Service logic with mocked dependencies, DTO/Event model tests, architecture tests (12 test files)
- **Infrastructure:** Repository queries, service integration, cloud provider tests, orchestration tests, hyperscale tests (20 test files)
- **API:** Controller tests, integration tests (WebApplicationFactory), SignalR notification tests (9 test files)
- **Frontend:** Service logic, component behavior (Vitest + jsdom)
- **E2E:** Persona-based Playwright tests (Admin, User, Guest, Resilience, Performance, Accessibility)

---

## 📚 Documentation

| Document                               | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)   | System overview, layer details, data flows      |
| [Design](docs/DESIGN.md)               | Design patterns, schema, API design, future plans |
| [CI/CD](docs/CI-CD.md)                 | Pipeline architecture, secrets, deployment guide |
| [Secret Rotation](docs/SECRET_ROTATION.md) | Rotating credentials and purging git history |
| [Masterplan](masterplan.md)            | Project roadmap, phases, and objectives         |
| [Azure Blob Int.](docs/azure-blob-integration.md) | Direct upload to Azure with SAS tokens          |
| [System Diagrams](docs/SYSTEM_DIAGRAMS.md) | Mermaid diagrams for architecture, data flow    |
| [Testing Guide](docs/TESTING_GUIDE.md) | Comprehensive testing guide (E2E, unit, integration) |
| [Test Summary](docs/TEST_IMPLEMENTATION_SUMMARY.md) | 219+ test cases across all layers        |
| [API Reference](docs/API_DOCUMENTATION.md) | Full Swagger-based API endpoint reference    |

---

## 🗺️ Roadmap

All **12 development phases** are complete. Phases are as defined in [`masterplan.md`](masterplan.md).

- [x] **Phase 1:** MVP Web App — Angular frontend, .NET backend, PostgreSQL, Azure Blob Storage integration
- [x] **Phase 2:** Chunked Uploads & Resumable Transfers — chunk strategy, delta sync
- [x] **Phase 3:** Offline-First + Versioning — offline edits, version vectors, conflict handling
- [x] **Phase 4:** Real-Time Sync — SignalR push notifications across devices
- [x] **Phase 5:** Security & Access Control — TLS, encryption, permission enforcement
- [x] **Phase 6:** Scalability & Partitioning — NGINX LB (3 API replicas), Redis, RabbitMQ, Prometheus/Grafana
- [x] **Phase 7:** Optional Enhancements — k6 load tests, Kubernetes manifests, email testing (Mailpit)
- [x] **Phase 8:** Architecture Modernization — OOP core/shared structure, Signal-based state
- [x] **Phase 9:** Advanced Data Management — Version History, Bulk Operations
- [x] **Phase 10:** Notification Persistence — Database-backed alerts and activity tracking
- [x] **Phase 11:** Comprehensive Frontend UI — 16+ feature areas including Trash, Recent, Sync History, Conflict Center
- [x] **Phase 12:** Distributed Systems Modules — Multi-provider storage, replication, tiering, Merkle trees, Saga transactions, consensus, erasure coding, chaos testing, admin control plane, comprehensive test suite (219+ tests)

---

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
