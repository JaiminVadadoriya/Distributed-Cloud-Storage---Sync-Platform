# Design Document — Distributed Cloud Storage Platform

> **Version:** 1.0 &nbsp;|&nbsp; **Last Updated:** February 2026

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
| **Scalability**       | Stateless API, containerized services, future-ready for Azure Blob   |

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

-- Supporting tables
RefreshTokens (Id PK GUID, Token UNIQUE, UserId FK→Users, ExpiresAt, IsRevoked, ...)
Devices (Id PK GUID, UserId FK→Users, DeviceName, DeviceType, ...)
FilePermissions (Id PK GUID, FileMetadataId FK, UserId FK→Users, PermissionType, ...)
SyncEvents (Id PK GUID, FileMetadataId FK, DeviceId FK→Devices, EventType, VersionVector, ...)
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

| Method | Endpoint              | Auth | Request Body         | Response                         |
| ------ | --------------------- | ---- | -------------------- | -------------------------------- |
| POST   | `/register`           | No   | `RegisterDto`        | `{ id, username, email }`        |
| POST   | `/login`              | No   | `LoginDto`           | `LoginResponseDto`               |
| POST   | `/refresh`            | No   | `RefreshTokenDto`    | `LoginResponseDto`               |
| POST   | `/logout`             | Yes  | `RefreshTokenDto`    | `{ message }`                    |
| POST   | `/password-reset-request` | No | `PasswordResetRequestDto` | `{ message }`             |
| POST   | `/password-reset`     | No   | `PasswordResetDto`   | `{ message }`                    |

#### Files (`/api/files`)

| Method | Endpoint                          | Auth | Description                       |
| ------ | --------------------------------- | ---- | --------------------------------- |
| GET    | `/`                               | Yes  | List user's files (owned + shared) |
| GET    | `/{id}`                           | Yes  | Get file details by ID            |
| POST   | `/`                               | Yes  | Create file metadata              |
| DELETE | `/{id}`                           | Yes  | Soft delete file (owner only)     |
| POST   | `/{id}/permissions`               | Yes  | Grant file permissions            |

#### Chunked Upload (`/api/files`)

| Method | Endpoint                    | Auth | Description                         |
| ------ | --------------------------- | ---- | ----------------------------------- |
| POST   | `/initiate`                 | Yes  | Start upload session                |
| POST   | `/chunks`                   | Yes  | Upload single chunk (multipart)     |
| POST   | `/complete`                 | Yes  | Finalize upload session             |
| GET    | `/session/{id}/status`      | Yes  | Get upload progress (for resume)    |

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

| Feature                          | Design Approach                                         |
| -------------------------------- | ------------------------------------------------------- |
| **Real-Time Sync (SignalR)**     | Add SignalR hub, push SyncEvents to connected devices   |
| **Azure Blob Storage**           | New `IChunkStorageService` implementation, swap via DI  |
| **Delta Sync**                   | Binary diff on chunk level, send only changed bytes     |
| **Client-Side Encryption**       | Encrypt chunks before upload, store key client-side     |
| **File Versioning UI**           | Expose `Version`, `ParentVersionId` in frontend         |
| **Conflict Resolution**          | Use `VersionVector` in SyncEvents for CRDT-style merge  |
| **Search Indexing**              | Elasticsearch integration for file content search       |
| **Rate Limiting**                | ASP.NET Core rate limiting middleware                    |
| **Redis Caching**                | Cache session state, hot file metadata (Redis already provisioned) |
| **Mobile Clients**               | Flutter/React Native using same REST API                |
