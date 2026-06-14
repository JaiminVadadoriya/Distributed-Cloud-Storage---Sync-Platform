# API Documentation

The Distributed Cloud Storage Platform uses Swagger (OpenAPI 3.0) for interactive API documentation.

## Accessing the Swagger UI

1. Start the API locally:
   ```bash
   cd CloudStorage.API
   dotnet run
   ```
2. Navigate to: `http://localhost:5000/swagger`
3. Raw spec: `http://localhost:5000/swagger/v1/swagger.json`

## Authentication

All endpoints (except `register`, `login`, `refresh`, and password-reset) require a JWT Bearer token:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
```

For SignalR hubs, pass the token as `?access_token=<token>` in the connection URL.

---

## Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create new user account |
| POST | `/api/auth/login` | No | Login → JWT access + refresh token |
| POST | `/api/auth/refresh` | No | Refresh expired access token |
| POST | `/api/auth/logout` | Yes | Revoke refresh token |
| POST | `/api/auth/password-reset-request` | No | Send password-reset email |
| POST | `/api/auth/password-reset` | No | Reset password using token from email |

---

### Files (`/api/files`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/files` | Yes | List owned + shared files |
| GET | `/api/files/stats` | Yes | Dashboard stats (storage used, file count, recent uploads) |
| GET | `/api/files/shared` | Yes | List files shared with the current user |
| GET | `/api/files/search?q=` | Yes | Search files by name |
| GET | `/api/files/{id}` | Yes | Get file details by ID |
| GET | `/api/files/{id}/versions` | Yes | Get file version history |
| POST | `/api/files/{id}/restore/{vId}` | Yes | Restore file to a previous version |
| GET | `/api/files/{id}/download` | Yes | Stream file download (supports HTTP Range) |
| GET | `/api/files/{id}/download-link` | Yes | Generate parallel download metadata with Azure SAS URLs per chunk |
| POST | `/api/files` | Yes | Create file metadata record |
| PATCH | `/api/files/{id}/rename` | Yes | Rename a file |
| PATCH | `/api/files/{id}/move` | Yes | Move file to a specific folder |
| POST | `/api/files/bulk-delete` | Yes | Delete multiple files at once |
| POST | `/api/files/bulk-move` | Yes | Move multiple files at once |
| POST | `/api/files/bulk-share` | Yes | Share multiple files with a user |
| POST | `/api/files/{id}/permissions` | Yes | Grant file permissions to another user |
| POST | `/api/files/{id}/share` | Yes | Alias for permissions (frontend compatibility) |
| DELETE | `/api/files/{id}` | Yes | Soft-delete a file (owner only) |
| DELETE | `/api/files/all` | Yes | Delete all files owned by the current user |

---

### Chunked Upload (`/api/files` — chunk routes)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/files/initiate` | Yes | Start upload session → returns `sessionId` + `fileId` |
| POST | `/api/files/chunks` | Yes | Upload a single chunk (multipart, max 5 MB) |
| POST | `/api/files/complete` | Yes | Finalize session after all chunks uploaded |
| GET | `/api/files/session/{id}/status` | Yes | Check upload progress (for resumable uploads) |

> **Note:** `POST /api/files/chunks` is protected by `UploadThrottlingMiddleware` — max 5 concurrent chunk uploads per user (Redis-backed).

---

### Folders (`/api/folders`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/folders/root` | Yes | List all root-level folders for the current user |
| GET | `/api/folders/{id}` | Yes | Get folder details by ID |
| POST | `/api/folders` | Yes | Create a new folder (`name`, optional `parentFolderId`) |
| PATCH | `/api/folders/{id}/rename` | Yes | Rename folder (`newName`) |
| PATCH | `/api/folders/{id}/move` | Yes | Move folder to a new parent (`newParentFolderId`) |
| DELETE | `/api/folders/{id}` | Yes | Delete folder (cascades to nested files) |
| POST | `/api/folders/{id}/share` | Yes | Share folder with another user; propagates to all nested files |

---

### Devices (`/api/devices`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/devices` | Yes | List all devices registered by the current user |
| POST | `/api/devices` | Yes | Register a new device for sync tracking |
| PATCH | `/api/devices/{id}/sync` | Yes | Update last-sync timestamp (call after each sync cycle) |
| DELETE | `/api/devices/{id}` | Yes | Remove a registered device |

---

### Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Yes | Get unread notifications for the current user |
| PATCH | `/api/notifications/{id}/read` | Yes | Mark a specific notification as read |
| POST | `/api/notifications/read-all` | Yes | Mark all notifications as read |

---

### Activity Feed (`/api/activity`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/activity?limit=50` | Yes | Recent activity log for the current user (default: 50) |

---

### Trash / Recycle Bin (`/api/trash`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/trash` | Yes | List all soft-deleted files for the current user |
| POST | `/api/trash/{id}/restore` | Yes | Restore a file from the trash |
| DELETE | `/api/trash/{id}` | Yes | Permanently delete a trashed file (must be soft-deleted first) |
| DELETE | `/api/trash/empty` | Yes | Empty entire trash bin — permanently deletes all trashed files |

---

### Admin (`/api/admin`) — Requires `Admin` Role

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | System-wide dashboard statistics (files, users, storage, trends, regional traffic) |
| GET | `/api/admin/users` | Admin | List all users with storage usage and status |
| POST | `/api/admin/users` | Admin | Provision a new user account |
| PATCH | `/api/admin/users/{id}/quota` | Admin | Update a user's storage quota |
| POST | `/api/admin/users/{id}/toggle-status` | Admin | Enable or disable a user account |
| GET | `/api/admin/health` | Admin | Detailed system health report (CPU, memory, disk, service checks) |
| GET | `/api/admin/audit?count=50` | Admin | Recent audit log entries (default: 50) |
| POST | `/api/admin/users/{id}/impersonate` | Admin | Generate an impersonation token for a user |

---

### Sync — Delta (`/api/sync/delta`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/sync/delta?sinceUtc=` | Yes | Get all file changes (created/modified/deleted) since the given UTC timestamp |

Response includes `serverTimestampUtc`, `changedFiles[]`, and `deletedFileIds[]`.

---

### Sync — Conflict Resolution (`/api/sync`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sync/check-conflicts` | Yes | Check whether a file has a conflict between client and server version vectors |
| POST | `/api/sync/resolve` | Yes | Resolve detected conflict: `resolution = "KeepLocal" (0)` or `"KeepServer" (1)` |

---

### Health (`/health`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Liveness check |
| GET | `/health/ready` | No | Readiness check (verifies DB connectivity) |
