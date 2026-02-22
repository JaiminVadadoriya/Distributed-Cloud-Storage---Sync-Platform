# Azure Blob Storage Integration

## Overview

The cloud storage system supports native, direct-to-cloud file uploads using **Azure Blob Storage**. This allows clients to upload large files directly into Azure via pre-signed SAS (Shared Access Signature) URLs, saving server bandwidth and preventing the API layer from becoming a bottleneck during large file transfers. 

The architecture uses a chunked, parallel upload approach:
1. The backend orchestrates upload metadata (tracking chunks).
2. The backend generates time-limited SAS URLs for clients.
3. The clients directly PUT chunk data to Azure Blob Storage.
4. The client notifies the backend that the chunk was uploaded.
5. Finally, the backend verifies the overall file integrity on Azure before marking the file as "Complete".

## Configuration

To enable Azure Blob Storage, update the `appsettings.json` (or Environment variables) to provide connection settings:

```json
"AzureBlob": {
  "ConnectionString": "UseDevelopmentStorage=true",
  "ContainerName": "cloudstorage-chunks",
  "SasTokenExpiryMinutes": 15
}
```

- **ConnectionString**: Provide the Azure Blob connection string. Defaults to Azurite (`UseDevelopmentStorage=true`) for local dev.
- **ContainerName**: The blob container where file chunks will be stored.
- **SasTokenExpiryMinutes**: How long the pre-signed SAS token remains valid (in minutes). Keep this short for improved security.

### Docker & Azurite (Local Development)

The `docker-compose.yml` natively includes **Azurite**, an official Azure Storage emulator. 

Run:
```bash
docker-compose up -d --build
```

Azurite runs locally on port `10000`. The API server is natively configured to communicate with the Azurite container.

## Architecture & Responsibilities

- **`BlobChunkStorageService`**: Replaces the local chunk storage layer. Interacts with the `Azure.Storage.Blobs` SDK. 
- **`BlobSasService`**: Generates short-lived, restrictively permissioned (`Create` | `Write`) SAS URLs so clients can write blob chunks securely without requiring account keys.
- **`AzureChunkVerificationService`**: Before finalizing any upload, this server-side validation checks that the chunk blobs actually exist in the blob container.

## Direct Upload Flow (Client Integration)

If you are building the client side (e.g., Angular Frontend), use the following flow:

### 1. Initiate Upload Session
Client sends `POST /api/files/initiate` with metadata (filename, total size, number of chunks).
Server returns a `sessionId`.

### 2. Upload Chunks concurrently (For each chunk):
**A. Get Pre-Signed URL**
Request `POST /api/files/sas-url` containing:
`{ "sessionId": "...", "chunkIndex": 0, "hash": "..." }`

Server checks global dedup cache for the client's supplied hash. 
- If duplicated, server returns `isDuplicate: true` and the client can silently skip uploading.
- Otherwise, server returns `sasUrl` (the time-limited direct Azure link).

**B. Direct Upload**
Using a HTTP client (like axios, fetch, or Angular HttpClient), perform an `HTTP PUT`.
```http
PUT <sasUrl>
x-ms-blob-type: BlockBlob
(RAW BINARY BODY)
```

**C. Verify & Register Chunk**
After the direct PUT request succeeds, instruct the internal API to track the chunk by calling:
`POST /api/files/verify-chunk` with:
`{ "sessionId": "...", "chunkIndex": 0, "hash": "...", "blobName": "<blobName from Step A>", "size": 1024 }`

### 3. Complete Upload
Client calls `POST /api/files/complete` with `{ "sessionId": "..." }`.
The server natively verifies Blob presence, locks the record, and the upload is finished.

## Legacy Compatibility

The server-proxied `POST /api/files/chunks` endpoint remains functional. If clients do not wish to orchestrate their own Azure requests, they can upload the binary to the internal API server directly, and the server will stream it to Azure Blob Storage on their behalf. Note that this adds overhead to the API instance and is generally not recommended for large files.
