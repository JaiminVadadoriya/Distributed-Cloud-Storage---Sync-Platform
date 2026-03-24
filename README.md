# ☁️ Distributed Cloud Storage & Sync Platform

A scalable, distributed cloud storage and synchronization platform built with **.NET 10** and **Angular 21**, following **Clean Architecture** principles. Designed to handle large files (up to 50 GB), support offline operations, and provide real-time synchronization.

---

## ✨ Features

- **Chunked Uploads** — Files are split into 5 MB chunks with SHA-256 hashing for integrity
- **Deduplication** — Identical chunks are stored once and reference-counted
- **Horizontal Scaling** — API scaled to 3+ replicas with **NGINX** load balancing
- **Distributed Caching** — **Redis** for metadata, permissions, and SignalR backplane
- **Async Background Tasks** — **RabbitMQ** for offloading heavy dedup/integrity checks
- **HTTP/2 & Compression** — Optimized network transfers with Brotli/Gzip and multiplexed connections
- **Observability** — **Prometheus** and **Grafana** for real-time traffic monitoring
- **Cloud-Ready** — Kubernetes manifests with HPA support and Docker Compose orchestration
- **Comprehensive Tests** — Unit tests across all 4 backend layers + k6 load tests (12k CCU)

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
| **Frontend**       | Angular 21 (TypeScript, Standalone)         |
| **Database**       | PostgreSQL 16 (EF Core)                     |
| **Cache**          | Redis 7 (Distributed Cache & Backplane)     |
| **Message Queue**  | RabbitMQ 3 (Background Processing)          |
| **Load Balancer**  | NGINX (Reverse Proxy, Compression)          |
| **Observability**  | Prometheus + Grafana                        |
| **Testing**        | xUnit, Moq, Vitest, **k6** (Load Testing)   |

---

## 📂 Project Structure

```
cloud-storage/
├── CloudStorage.API/                    # Entry point & controllers
│   ├── Controllers/
│   │   ├── AuthController.cs            #   Registration, login, token refresh, password reset
│   │   ├── FilesController.cs           #   File CRUD, search, download, permissions, stats
│   │   ├── ChunkUploadController.cs     #   Chunked upload workflow
│   │   ├── FoldersController.cs         #   Folder CRUD, rename, move, share
│   │   ├── DevicesController.cs         #   Device registration & sync tracking
│   │   ├── ActivityController.cs        #   Activity feed
│   │   ├── DeltaSyncController.cs       #   Delta sync (changes since timestamp)
│   │   ├── ConflictController.cs        #   Conflict check & resolution
│   │   └── HealthController.cs          #   Liveness & readiness probes
│   ├── Services/
│   │   └── UploadThrottlingMiddleware.cs #  Max 5 concurrent chunk uploads per user (Redis)
│   ├── Program.cs                       #   DI, middleware, pipeline config
│   ├── Dockerfile                       #   Multi-stage .NET build
│   └── appsettings.json                 #   Configuration (JWT, DB, CORS)
│
├── CloudStorage.Application/            # Business contracts
│   ├── DTOs/                            #   UserDtos, FileDtos, ChunkUploadDtos, FolderDtos,
│   │                                    #   DeviceDtos, ConflictDtos, DeltaSyncDtos
│   └── Interfaces/                      #   IAuthService, IFileService, IFolderService,
│                                        #   IDeviceService, IActivityService,
│                                        #   IConflictDetectionService, IDeltaSyncService, etc.
│
├── CloudStorage.Domain/                 # Core entities (zero dependencies)
│   ├── Entities/                        #   User, FileMetadata, FileChunk, Folder, Device,
│   │                                    #   SyncEvent, ActivityLog, FilePermission, etc.
│   └── Interfaces/                      #   IRepository<T>, IUserRepository, etc.
│
├── CloudStorage.Infrastructure/         # Implementations
│   ├── Data/ApplicationDbContext.cs      #   EF Core with Fluent API
│   ├── Repositories/                    #   Generic & specialized repos
│   ├── Services/                        #   Auth, File, Chunk, Dedup, Token, Folder,
│   │                                    #   Device, Activity, DeltaSync, Conflict, etc.
│   └── Migrations/                      #   EF Core migrations
│
├── CloudStorage.Client/                 # Angular 21 frontend
│   ├── src/app/
│   │   ├── core/                        #   file.service, folder.service, device.service,
│   │   │                                #   activity.service, sync-engine.service,
│   │   │                                #   signalr.service, offline-cache.service, etc.
│   │   ├── services/                    #   chunking.service, upload.service, upload-manager
│   │   ├── components/                  #   FileUpload, UploadProgress, ConflictDialog
│   │   └── features/                    #   auth/, dashboard/, settings/
│   ├── Dockerfile                       #   Node 22 → Nginx SPA
│   └── nginx.conf                       #   SPA routing config
│
├── monitoring/                          # Observability Config
│   ├── prometheus.yml                   #   Metric scrape config
│   └── grafana/dashboards/              #   Pre-built API dashboards
│
├── k8s/                                 # Kubernetes Manifests
│   ├── api-deployment.yaml              #   HPA, Replicas, Requests/Limits
│   └── ingress-nginx.yaml               #   Ingress & WebSocket annotations
│
├── nginx/                               # Load Balancer Config
│   └── nginx.conf                       #   Load balancing & compression
│
├── tests/                               # Test Projects
│   ├── ...                              #   Backend & Frontend projects
│   └── load/                            #   **k6** Stress test scripts (12k CCU)
│
├── docker-compose.yml                   # Full orchestration (9+ services)
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

| Service      | URL                                  |
| ------------ | ------------------------------------ |
| API (via LB) | http://localhost:5000                |
| Frontend     | http://localhost:4200                |
| Swagger      | http://localhost:5000/swagger        |
| Grafana      | http://localhost:3000 (admin/admin)  |
| Prometheus   | http://localhost:9090                |
| RabbitMQ     | http://localhost:15672 (guest/guest) |
| PostgreSQL   | localhost:5433                       |
| Redis        | localhost:6379                       |

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
| `DELETE /api/files/{id}`               | DELETE | Yes  | Soft delete a file             |
| `DELETE /api/files/all`                | DELETE | Yes  | Delete all owned files         |

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

### Activity Feed

| Endpoint                          | Method | Auth | Description                         |
| --------------------------------- | ------ | ---- | ----------------------------------- |
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
- **Domain:** Entity validations, default values, relationships, cascade behavior
- **Application:** Service method logic with mocked dependencies
- **Infrastructure:** Repository queries, service integration with in-memory DB
- **API:** Controller response codes, authorization, input validation
- **Frontend:** Service logic, component behavior (Vitest + jsdom)

---

## 📚 Documentation

| Document                               | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| [Architecture](docs/ARCHITECTURE.md)   | System overview, layer details, data flows      |
| [Design](docs/DESIGN.md)               | Design patterns, schema, API design, future plans |
| [CI/CD](docs/CI-CD.md)                 | Pipeline architecture, secrets, deployment guide |
| [Masterplan](masterplan.md)            | Project roadmap, phases, and objectives         |
| [Azure Blob Int.](docs/azure-blob-integration.md) | Direct upload to Azure with SAS tokens          |

---

## 🗺️ Roadmap

- [x] **Phase 1:** MVP — Backend API, PostgreSQL, Docker setup
- [x] **Phase 2:** Database refinement, JWT auth, file management
- [x] **Phase 3:** Chunked uploads with deduplication
- [x] **Phase 4:** Horizontal Scaling & NGINX Load Balancing
- [x] **Phase 5:** Redis Caching & SignalR Backplane
- [x] **Phase 6:** RabbitMQ Background Worker & Async processing
- [x] **Phase 7:** Observability (Prometheus/Grafana)
- [x] **Phase 8:** CDN Optimization & HTTP/2
- [x] **Phase 9:** Kubernetes Manifests
- [x] **Phase 10:** Load Testing with k6 (12k Users Target)

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
