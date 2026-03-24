# Design Document — Distributed Cloud Storage Platform

> **Version:** 2.0 &nbsp;|&nbsp; **Last Updated:** March 2026

---

## 1. Design Principles

| Principle             | Application in This Project                                           |
| --------------------- | --------------------------------------------------------------------- |
| **Clean Architecture** | Strict layer separation; domain has zero external dependencies       |
| **Dependency Inversion** | All services depend on interfaces defined in Domain/Application    |
| **Single Responsibility** | Each service handles one concern (auth, files, chunks, dedup)    |
| **Interface Segregation** | Separate interfaces for Auth, Files, Chunks, Dedup, Tokens       |
| **Offline-First**     | Resumable uploads, chunk-level state tracking on server              |
| **Security by Design** | BCrypt, JWT rotation, CORS, HTTPS, owner-based permissions          |
| **Scalability**       | **Horizontal scaling (replicas)**, NGINX LB, Redis Backplane         |
| **Observability**     | **Prometheus/Grafana** for metrics and health monitoring             |

---

## 2. Design Patterns

### 2.1 Repository Pattern

```csharp
// Generic base with standard CRUD
IRepository<T> → Repository<T> (EF Core)

// Specialized repositories extend the base
IUserRepository : IRepository<User>
IFileMetadataRepository : IRepository<FileMetadata>
```

**Rationale:** Abstracts data access, enables unit testing with mocks, and allows switching storage providers without touching business logic.

### 2.2 Service Layer Pattern

```csharp
// Application defines contracts
IAuthService, IFileService, IChunkStorageService, IDeduplicationService

// Infrastructure provides implementations
AuthService, FileService, ChunkStorageService, DeduplicationService
```

Services encapsulate business logic and orchestrate repository calls. Controllers remain thin — they validate input, call services, and format responses.

### 2.3 DTO Pattern (Data Transfer Objects)

```
Domain Entity ──[Service Layer maps]──> DTO ──[Controller returns]──> Client
```

DTOs prevent leaking domain internals (navigation properties, password hashes) and provide a stable API contract independent of schema changes.

### 2.4 Token Rotation Pattern

```
Login:
  1. User authenticates → AccessToken (15 min) + RefreshToken (7 days)

Refresh:
  1. Client sends expired access token + valid refresh token
  2. Server validates refresh token
  3. Server revokes old refresh token
  4. Server issues NEW access token + NEW refresh token
  5. Old refresh token can never be reused (prevents replay attacks)
```

### 2.5 Chunked Upload with Deduplication

```
For each chunk:
  1. Client computes SHA-256 hash
  2. Client sends chunk + hash to server
  3. Server checks ChunkRegistry for existing hash
     ├─ Found: Increment reference count, skip file write
     └─ Not Found: Write chunk to disk, create registry entry
  4. Create FileChunk record linking to FileMetadata
```

### 2.6 Distributed Systems Patterns

**SignalR Backplane (Redis):** To support horizontal scaling, we use Redis as a backplane. When an instance broadcasts a message, it is published to Redis and picked up by all other API instances, ensuring all connected clients receive the notification regardless of the node they are connected to.

**Worker Pattern (RabbitMQ):** Heavy operations like hash-verification and chunk cleanup are offloaded to a background queue. The API publishes a message, and a dedicated worker (running inside each API instance) consumes and processes it, keeping the request-response cycle fast.

**Rate Limiting (NGINX):** Global rate limiting is applied at the entry point (NGINX) to protect against DDoS and brute-force attempts before they hit the API.

**Reference Counting:** When a chunk is deleted, its `ChunkRegistry.ReferenceCount` is decremented. At zero, the physical file and registry entry are cleaned up.

---

## 3. Database Design

### 3.1 Schema Overview

```sql
-- Core tables
Users (Id PK, Username UNIQUE, Email UNIQUE, PasswordHash, ...)
FileMetadata (Id PK GUID, FileName, Size, Version, OwnerId FK→Users, UploadSessionId, Status, ...)
FileChunks (Id PK GUID, FileMetadataId FK, ChunkIndex, Hash, StoragePath, IsDuplicate, ...)
ChunkRegistry (Hash PK, StoragePath, Size, ReferenceCount, ...)
Folders (Id PK GUID, Name, OwnerId FK→Users, ParentFolderId FK→Folders nullable, ...)

-- Supporting tables
RefreshTokens (Id PK GUID, Token UNIQUE, UserId FK→Users, ExpiresAt, IsRevoked, ...)
Devices (Id PK GUID, UserId FK→Users, DeviceName, DeviceType, LastSyncAt, ...)
FilePermissions (Id PK GUID, FileMetadataId FK, UserId FK→Users, PermissionType, ...)
FolderPermissions (Id PK GUID, FolderId FK→Folders, UserId FK→Users, PermissionType, ...)
SyncEvents (Id PK GUID, FileMetadataId FK, DeviceId FK→Devices, EventType, VersionVector, ...)
ActivityLogs (Id PK GUID, UserId FK→Users, EventType, TargetId, TargetName, Timestamp, ...)
```

### 3.2 Indexing Strategy

| Table           | Index                              | Type     | Purpose                        |
| --------------- | ---------------------------------- | -------- | ------------------------------ |
| Users           | `(Email)`, `(Username)`            | Unique   | Fast login lookup              |
| FileMetadata    | `(OwnerId)`, `(Hash)`             | Standard | User file listing, dedup       |
| FileChunks      | `(FileMetadataId, ChunkIndex)`     | Unique   | Prevent duplicate chunk upload |
| FileChunks      | `(Hash)`                           | Standard | Deduplication lookup           |
| RefreshTokens   | `(Token)`, `(UserId)`             | Unique/Std | Token validation             |
| FilePermissions | `(FileMetadataId, UserId)`         | Unique   | One permission per user per file |
| SyncEvents      | `(Timestamp)`, `(FileMetadataId)` | Standard | Event ordering and file lookup |
| ChunkRegistry   | `(Hash)`                           | Unique (PK) | Global chunk dedup          |

### 3.3 Cascade Rules

```
User deleted:
  → RefreshTokens: CASCADE (auto-delete)
  → Devices: CASCADE (auto-delete)
  → FileMetadata (as Owner): RESTRICT (must delete files first)
  → FilePermissions (as grantee): RESTRICT (must revoke permissions first)

FileMetadata deleted:
  → FileChunks: CASCADE (auto-delete chunks)
  → FilePermissions: CASCADE (auto-delete permissions)
  → SyncEvents: CASCADE (auto-delete sync history)

Device deleted:
  → SyncEvents (as source device): RESTRICT (preserves audit trail)
```

---

## 4. API Design

### 4.1 RESTful Conventions

- **Resource-based URLs:** `/api/auth`, `/api/files`, `/health`
- **Standard HTTP Methods:** GET (read), POST (create), DELETE (remove)
- **Status Codes:** 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 501 (Not Implemented), 503 (Service Unavailable)
- **Consistent Error Format:** `{ "message": "Error description" }`

### 4.2 API Endpoints

#### Authentication (`/api/auth`)

| Method | Endpoint                   | Auth | Request Body                | Response              |
| ------ | -------------------------- | ---- | --------------------------- | --------------------- |
| POST   | `/register`                | No   | `RegisterDto`               | `{ id, username, email }` |
| POST   | `/login`                   | No   | `LoginDto`                  | `LoginResponseDto`    |
| POST   | `/refresh`                 | No   | `RefreshTokenDto`           | `LoginResponseDto`    |
| POST   | `/logout`                  | Yes  | `RefreshTokenDto`           | `{ message }`         |
| POST   | `/password-reset-request`  | No   | `PasswordResetRequestDto`   | `{ message }`         |
| POST   | `/password-reset`          | No   | `PasswordResetDto`          | `{ message }`         |

#### Files (`/api/files`)

| Method | Endpoint                   | Auth | Description                                          |
| ------ | -------------------------- | ---- | ---------------------------------------------------- |
| GET    | `/`                        | Yes  | List user's files (owned + shared)                   |
| GET    | `/stats`                   | Yes  | Dashboard stats (storage used, count, recent uploads) |
| GET    | `/shared`                  | Yes  | List files shared with the current user              |
| GET    | `/search?q=`               | Yes  | Search files by name                                 |
| GET    | `/{id}`                    | Yes  | Get file details by ID                               |
| GET    | `/{id}/download`           | Yes  | Stream file download (HTTP Range supported)          |
| GET    | `/{id}/download-link`      | Yes  | Generate per-chunk SAS URLs for parallel download    |
| POST   | `/`                        | Yes  | Create file metadata record                          |
| POST   | `/{id}/permissions`        | Yes  | Grant file permission to another user                |
| POST   | `/{id}/share`              | Yes  | Alias for `/permissions` (frontend compatibility)    |
| DELETE | `/{id}`                    | Yes  | Soft delete file (owner only)                        |
| DELETE | `/all`                     | Yes  | Delete all files owned by the current user           |

#### Chunked Upload (`/api/files`)

| Method | Endpoint              | Auth | Description                         |
| ------ | --------------------- | ---- | ----------------------------------- |
| POST   | `/initiate`           | Yes  | Start upload session                |
| POST   | `/chunks`             | Yes  | Upload single chunk (multipart, max 5 MB) — throttled: max 5 concurrent per user |
| POST   | `/complete`           | Yes  | Finalize upload session             |
| GET    | `/session/{id}/status`| Yes  | Get upload progress (for resume)    |

#### Folders (`/api/folders`)

| Method | Endpoint           | Auth | Description                                               |
| ------ | ------------------ | ---- | --------------------------------------------------------- |
| GET    | `/root`            | Yes  | List all root-level folders for the current user          |
| GET    | `/{id}`            | Yes  | Get folder details by ID                                  |
| POST   | `/`                | Yes  | Create a folder (`name`, optional `parentFolderId`)       |
| PATCH  | `/{id}/rename`     | Yes  | Rename a folder (`newName`)                               |
| PATCH  | `/{id}/move`       | Yes  | Move folder to a new parent (`newParentFolderId`)         |
| DELETE | `/{id}`            | Yes  | Delete folder; cascades to nested files                   |
| POST   | `/{id}/share`      | Yes  | Share folder with a user; propagates to all nested files  |

#### Devices (`/api/devices`)

| Method | Endpoint        | Auth | Description                                          |
| ------ | --------------- | ---- | ---------------------------------------------------- |
| GET    | `/`             | Yes  | List devices registered by the current user          |
| POST   | `/`             | Yes  | Register a new device for sync tracking              |
| PATCH  | `/{id}/sync`    | Yes  | Update last-sync timestamp (call after each cycle)   |
| DELETE | `/{id}`         | Yes  | Remove a registered device                           |

#### Activity Feed (`/api/activity`)

| Method | Endpoint         | Auth | Description                                       |
| ------ | ---------------- | ---- | ------------------------------------------------- |
| GET    | `/?limit=50`     | Yes  | Recent activity log for the current user (default: last 50 events) |

#### Sync — Delta (`/api/sync/delta`)

| Method | Endpoint              | Auth | Description                                                      |
| ------ | --------------------- | ---- | ---------------------------------------------------------------- |
| GET    | `/?sinceUtc=`         | Yes  | Get all file changes since the given UTC timestamp. Returns `serverTimestampUtc`, `changedFiles[]`, `deletedFileIds[]` |

#### Sync — Conflicts (`/api/sync`)

| Method | Endpoint              | Auth | Description                                                          |
| ------ | --------------------- | ---- | -------------------------------------------------------------------- |
| POST   | `/check-conflicts`    | Yes  | Compare client version vector with server. Returns `hasConflict`, server metadata |
| POST   | `/resolve`            | Yes  | Resolve conflict: `resolution = 0 (KeepLocal)` or `1 (KeepServer)` |

#### Health (`/health`)

| Method | Endpoint  | Auth | Description                        |
| ------ | --------- | ---- | ---------------------------------- |
| GET    | `/`       | No   | Basic liveness check               |
| GET    | `/ready`  | No   | Readiness check (DB connectivity)  |

---

## 5. Frontend Component Design

### 5.1 Service Architecture

```
┌──────────────────────────────────────────────────────┐
│                  UploadManagerService                 │  ← Orchestrator
│  - Queue management with BehaviorSubject             │
│  - Concurrency control (max 3 parallel uploads)      │
│  - Pause / Resume / Cancel operations                │
│  - Progress tracking (speed, ETA, chunk count)       │
├───────────────┬──────────────────────────────────────┤
│ ChunkingService │          UploadService              │  ← Workers
│ - File slicing  │  - HTTP calls to backend            │
│ - SHA-256 hash  │  - Retry with exponential backoff   │
│ - 5MB chunks    │  - Session management               │
└─────────────────┴────────────────────────────────────┘
```

### 5.2 Component Hierarchy

```
App (root)
└── RouterOutlet
    ├── FileUploadComponent (drag & drop file picker)
    │   ├── onFileSelected → validate → emit FileUploadEvent[]
    │   ├── onDragOver / onDragLeave / onDrop
    │   └── Validation: max 50GB, non-empty
    │
    └── UploadProgressComponent (real-time tracker)
        ├── Inputs: UploadProgress (fileName, chunks, speed, status)
        ├── Outputs: pause, resume, cancel events
        ├── Computed: progressPercentage, estimatedTimeRemaining
        └── Display: speed (bytes/s), uploaded/total size
```

### 5.3 Upload State Machine

```
         ┌──────────┐
         │ pending   │
         └─────┬─────┘
               │ processQueue()
         ┌─────▼─────┐
    ┌────>│ uploading │<────┐
    │     └─────┬─────┘     │
    │           │           │
    │     ┌─────▼─────┐     │
    │     │  paused    │────┘
    │     └───────────┘  resumeUpload()
    │
    │     ┌─────────────┐
    └────>│  complete    │  (success)
          └─────────────┘
          ┌─────────────┐
          │   error      │  (failure / cancelled)
          └─────────────┘
```

---

## 6. Storage Design

### 6.1 Current: Local Filesystem

```
/app/storage/chunks/
├── {fileId-1}/
│   ├── 0.chunk
│   ├── 1.chunk
│   └── 2.chunk
├── {fileId-2}/
│   ├── 0.chunk
│   └── 1.chunk
└── ...
```

### 6.2 Future: Azure Blob Storage

The current local storage is designed for easy migration to Azure Blob Storage:
- `IChunkStorageService` interface abstracts the storage backend
- New `AzureBlobChunkStorageService` can be swapped in via DI
- No changes needed in controllers or business logic

---

## 7. Deduplication Design

```
                                    ┌──────────────────┐
File Upload                         │  ChunkRegistry   │
  │                                 │ (Hash → Path)    │
  │                                 └──────────────────┘
  ▼                                        ▲
Calculate SHA-256 hash  ──────────────────>│
  │                                        │
  ├── Hash exists? ────── YES ─── Increment RefCount, skip write
  │                                Return existing storage path
  │
  └── Hash NOT found ──── NO ──── Write chunk to disk
                                  Register in ChunkRegistry (RefCount=1)
```

**Benefits:**
- Identical chunks (across all users/files) are stored only once
- Reference counting enables safe garbage collection
- SHA-256 provides collision-resistant identification

---

## 8. Error Handling Strategy

### Backend

| Layer          | Strategy                                                   |
| -------------- | ---------------------------------------------------------- |
| Controllers    | Try-catch with typed responses (400, 401, 403, 404, 501)  |
| Services       | Throw domain exceptions (`Exception`, `UnauthorizedAccessException`) |
| Repository     | Let EF Core exceptions propagate                           |

### Frontend

| Component       | Strategy                                                   |
| --------------- | ---------------------------------------------------------- |
| UploadService   | Retry with exponential backoff (3 attempts)               |
| UploadManager   | Catch errors → set status to 'error' with message         |
| FileUpload      | Client-side validation (size, emptiness)                  |

---

## 9. Future Design Considerations

| Feature                          | Status | Design Approach                                         |
| -------------------------------- | ------ | ------------------------------------------------------- |
| **Real-Time Sync (SignalR)**     | ✅ Done | Redis-backplaned SignalR hub pushes `FileUploaded`, `FileDeleted` events |
| **Azure Blob Storage**           | ✅ Done | `AzureBlobChunkStorageService` implements `IChunkStorageService`; SAS token generation via `IBlobSasService` |
| **Delta Sync**                   | ✅ Done | `GET /api/sync/delta?sinceUtc=` returns changed/deleted file IDs since timestamp |
| **Conflict Resolution**          | ✅ Done | Version-vector comparison via `POST /api/sync/check-conflicts` + `POST /api/sync/resolve` |
| **Folder Management**            | ✅ Done | Full CRUD + share via `/api/folders` |
| **Device Tracking**              | ✅ Done | Register/remove devices + last-sync timestamp via `/api/devices` |
| **Activity Feed**                | ✅ Done | `GET /api/activity` returns `ActivityLog` entries |
| **Upload Throttling**            | ✅ Done | `UploadThrottlingMiddleware` caps concurrent chunk uploads at 5 per user (Redis-backed) |
| **File Search**                  | ✅ Done | `GET /api/files/search?q=` for name-based search |
| **Client-Side Encryption**       | ⬜ Future | Encrypt chunks before upload, store key client-side |
| **File Versioning UI**           | ⬜ Future | Expose `Version`, `ParentVersionId` in frontend |
| **Search Indexing**              | ⬜ Future | Elasticsearch integration for file content search |
| **Rate Limiting**                | ✅ Done | **NGINX** level (IP-based) + `[EnableRateLimiting]` on controllers |
| **Redis Caching**                | ✅ Done | Sessions, metadata, permissions, and upload throttle |
| **Observability**                | ✅ Done | **Prometheus + Grafana** pre-provisioned |
| **CDN Optimization**             | ✅ Done | Cache-Control & HTTP Range headers + `X-Accel-Buffering` |
| **Mobile Clients**               | ⬜ Future | Flutter/React Native using same REST API |
