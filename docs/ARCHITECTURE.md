# Architecture Document — Distributed Cloud Storage Platform

> **Version:** 1.0 &nbsp;|&nbsp; **Last Updated:** February 2026

---

## 1. System Overview

The Distributed Cloud Storage Platform is a full-stack application built using **Clean Architecture** principles. It provides scalable, chunked file storage with deduplication, resumable uploads, JWT-based authentication, and cross-device synchronization capabilities.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose Host                         │
│                                                                    │
│  ┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │  Angular 21   │   │   .NET 9 API     │   │  PostgreSQL 16   │  │
│  │  Client       │──>│   (REST)         │──>│  (Metadata DB)   │  │
│  │  :4200        │   │   :5000 / :5001  │   │  :5432           │  │
│  └───────────────┘   └──────────────────┘   └──────────────────┘  │
│                              │                                     │
│                              v                                     │
│                      ┌──────────────────┐   ┌──────────────────┐  │
│                      │  Local File      │   │  Redis 7         │  │
│                      │  Storage         │   │  (Cache/Future)  │  │
│                      │  /app/storage/   │   │  :6379           │  │
│                      └──────────────────┘   └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

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
| `Device`               | User device for cross-device sync                                |
| `FilePermission`       | Access control (Read/Write/Owner) per file per user              |
| `RefreshToken`         | JWT refresh token with revocation support                        |
| `SyncEvent`            | Synchronization event log per file per device                    |
| `IRepository<T>`       | Generic repository abstraction (CRUD + predicate queries)        |
| `IUserRepository`      | Extended user queries (by username, email, with includes)        |
| `IFileMetadataRepository` | Extended file queries (by session, with chunks/permissions)   |

**Enums:** `UploadStatus` (Pending → InProgress → Complete/Failed/Cancelled), `PermissionType` (Read/Write/Owner), `SyncEventType` (Created/Modified/Deleted/Renamed)

### 2.2 Application Layer (`CloudStorage.Application`)

Defines business contracts and data transfer objects.

**Service Interfaces:**

| Interface                | Responsibility                                        |
| ------------------------ | ----------------------------------------------------- |
| `IAuthService`           | Registration, login, JWT tokens, password reset       |
| `IFileService`           | File CRUD, permission grants, user file listing       |
| `IChunkStorageService`   | Physical chunk I/O (save, get, delete, existence)     |
| `IDeduplicationService`  | Chunk registry with reference counting                |
| `IRefreshTokenService`   | Refresh token lifecycle (generate, validate, revoke)  |

**DTOs (12 total):**

- **Auth:** `RegisterDto`, `LoginDto`, `LoginResponseDto`, `RefreshTokenDto`, `PasswordResetRequestDto`, `PasswordResetDto`
- **Files:** `FileResponseDto`, `FileUploadDto`, `FilePermissionDto`, `FileListDto`
- **Chunks:** `InitiateUploadDto`, `UploadSessionResponseDto`, `ChunkUploadResponseDto`, `CompleteUploadDto`, `UploadStatusResponseDto`

### 2.3 Infrastructure Layer (`CloudStorage.Infrastructure`)

Implements all interfaces defined in Domain and Application.

| Component               | Implementation Details                                       |
| ------------------------ | ----------------------------------------------------------- |
| `ApplicationDbContext`   | EF Core with Fluent API: unique indexes, cascade/restrict deletes, composite keys |
| `Repository<T>`         | Generic EF Core repository                                  |
| `UserRepository`        | Eager loading for Devices, RefreshTokens                    |
| `FileMetadataRepository`| Session-based lookup, permission checks with include chains |
| `AuthService`           | BCrypt password hashing, JWT generation (HS256), refresh token rotation |
| `FileService`           | File metadata CRUD with owner-based permission enforcement  |
| `ChunkStorageService`   | Local filesystem chunk storage (`/app/storage/chunks/{fileId}/{index}.chunk`) |
| `DeduplicationService`  | Hash-based ChunkRegistry with reference counting            |
| `RefreshTokenService`   | Cryptographic token generation, expiration, revocation      |

**Database Migrations:**
1. `InitialCreate` — Base schema (Users, Files, Chunks, Permissions, etc.)
2. `Phase2_DatabaseRefinement` — Index optimization, constraint refinements
3. `AddChunkingSupport` — ChunkRegistry, upload session fields

### 2.4 API Layer (`CloudStorage.API`)

RESTful API entry point with Swagger documentation.

| Controller              | Route Prefix       | Auth Required | Endpoints                                          |
| ----------------------- | ------------------ | ------------- | -------------------------------------------------- |
| `AuthController`        | `api/auth`         | Partial       | register, login, refresh, logout, password-reset   |
| `FilesController`       | `api/files`        | Yes           | GET list, GET by ID, POST create, DELETE, POST permissions |
| `ChunkUploadController` | `api/files`        | Yes           | POST initiate, POST chunks, POST complete, GET session status |
| `HealthController`      | `health`           | No            | GET health, GET ready (with DB connectivity check) |

**Middleware Pipeline:** HTTPS Redirect → CORS → Authentication → Authorization → Controllers

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

| Service                | Image                  | Port Mapping   | Purpose                    |
| ---------------------- | ---------------------- | -------------- | -------------------------- |
| `cloudstorage.api`     | Custom (.NET 9 SDK)    | 5000:8080, 5001:8081 | REST API server      |
| `cloudstorage.client`  | Custom (Node 22 → Nginx) | 4200:80     | Angular SPA                |
| `postgres`             | postgres:16-alpine     | 5432:5432      | Metadata database          |
| `redis`                | redis:7-alpine         | 6379:6379      | Cache (provisioned, not yet wired) |

### 5.2 API Dockerfile (Multi-stage)

```
Stage 1 (base):    mcr.microsoft.com/dotnet/aspnet:9.0 → Exposes 8080, 8081
Stage 2 (build):   mcr.microsoft.com/dotnet/sdk:9.0   → Restore, build
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
│   ├── app.ts                         # Root component with RouterOutlet
│   ├── app.config.ts                  # Application providers
│   ├── app.routes.ts                  # Route definitions (empty — MVP)
│   ├── services/
│   │   ├── chunking.service.ts        # File → chunks splitter (SHA-256)
│   │   ├── upload.service.ts          # HTTP client for chunk upload API
│   │   └── upload-manager.service.ts  # Upload queue with concurrency control
│   └── components/
│       ├── file-upload/               # Drag-and-drop file picker
│       └── upload-progress/           # Real-time progress tracker
├── main.ts                            # Bootstrap
└── test-setup.ts                      # Vitest configuration
```

**Key Features:**
- **Chunking:** SHA-256 hashing via Web Crypto API, 5 MB chunk size
- **Upload Manager:** Queue-based with configurable concurrency (default: 3), pause/resume/cancel
- **Retry Logic:** Exponential backoff (1s, 2s, 4s) with 3 max retries
- **Standalone Components:** All components are standalone (Angular 21 pattern)
- **Testing:** Vitest 4.x with jsdom environment

---

## 7. Testing Architecture

```
tests/
├── CloudStorage.Domain.Tests/           # Entity validations, relationship tests
│   ├── Entities/                         # 8 entity test files
│   └── Relationships/                    # EntityRelationshipTests.cs
├── CloudStorage.Application.Tests/       # Service logic tests
│   └── Services/                         # AuthService, FileService, RefreshTokenService
├── CloudStorage.Infrastructure.Tests/    # Repository + service integration tests
│   ├── Repositories/                     # FileMetadata, User repository tests
│   └── Services/                         # ChunkStorage, Deduplication, RefreshToken
└── CloudStorage.API.Tests/               # Controller tests
    └── Controllers/                      # Auth, ChunkUpload, Files, Health
```

**Frontend Tests:** Located alongside source files using `*.spec.ts` convention, run with Vitest.

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
| Secrets        | Environment variables in Docker Compose                    |

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
