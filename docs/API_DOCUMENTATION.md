# API Documentation

The Distributed Cloud Storage Platform uses Swagger (OpenAPI 3.0) for interactive API documentation. 

## Accessing the Swagger UI

1. Start the API locally:
   ```bash
   cd CloudStorage.API
   dotnet run
   ```
2. Navigate your browser to: `https://localhost:5001/swagger` or `http://localhost:5000/swagger`.
3. The raw `swagger.json` definition can be downloaded directly from `http://localhost:5000/swagger/v1/swagger.json`.

## Core API Endpoints Overview

The API is fully documented via Swagger, but here is a brief overview of the key controllers and their main functions:

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Registers a new user.
- `POST /api/auth/login` - Authenticates a user and returns a JWT pair (Access + Refresh token).
- `POST /api/auth/refresh` - Refreshes an expired JWT using a valid refresh token.
- `POST /api/auth/logout` - Revokes a refresh token.

### File Management (`/api/files`)
- `GET /api/files` - Retrieves a paginated list of file metadata for the authenticated user.
- `POST /api/files/initiate` - Initiates a chunked file upload and returns a session ID. Verifies SHA-256 for deduplication.
- `POST /api/files/upload/{sessionId}` - Uploads a chunk of the file (maximum 5MB per chunk).
- `POST /api/files/complete/{sessionId}` - Finalizes the upload session once all chunks are fully pushed.
- `GET /api/files/download/{id}` - Downloads a file as a stream.
- `DELETE /api/files/{id}` - Soft/Hard deletes a file depending on configuration, cascading deletions of chunks.

### Statistics and Metrics (`/api/files/stats`)
- `GET /api/files/stats` - Retrieves overall statistics like total files, storage used, and recent activity for the user's dashboard.

### Real-Time Sync (`/api/sync`)
- `GET /api/sync/delta` - Emits changes (delta) made since a specific timestamp/token to optimize syncing across devices.

## Authentication
All endpoints (except login and registration) are protected by JWT. The `Authorization` header must be provided as `Bearer <token>`.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
```

For SignalR hubs, the token must be passed as a query string parameter `?access_token=<token>` when initiating the connection.
