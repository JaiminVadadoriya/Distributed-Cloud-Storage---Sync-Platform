# System Architecture Diagrams

This document contains visual representations of the system architecture for the Distributed Cloud Storage Platform.

## 1. High-Level Architecture

The system utilizes a split frontend/backend architecture, with the backend built on .NET 9 and PostgreSQL, and the frontend on Angular 21.

```mermaid
graph TD
    subgraph Client Layer
        Web[Angular Web App]
        Mobile[CinePhone Pro App]
    end

    subgraph API Layer
        API[CloudStorage.API - .NET 9]
        Hub[SignalR Storage Hub]
    end

    subgraph Infrastructure Layer
        DB[(PostgreSQL)]
        BlobStorage[(Azure Blob Storage)]
    end

    Web -->|HTTPS| API
    Web <-->|WebSockets| Hub
    Mobile -->|HTTPS| API

    API -->|EF Core Core| DB
    API -->|Azure SDK| BlobStorage
    Hub -->|EF Core| DB
```

## 2. Clean Architecture Pattern

The backend is structured using Clean Architecture to decouple business logic from infrastructure concerns.

```mermaid
graph TD
    Domain[CloudStorage.Domain]
    App[CloudStorage.Application]
    Infra[CloudStorage.Infrastructure]
    API[CloudStorage.API]

    App -->|References| Domain
    Infra -->|References| App
    Infra -->|References| Domain
    API -->|References| App
    API -->|References| Infra
    API -->|References| Domain
```

## 3. Chunked File Upload Flow

File uploads are handled by breaking the file into 5MB chunks and uploading them directly to Azure Blob Storage via SAS tokens (or processed by the backend if local storage is used).

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB as PostgreSQL
    participant Blob as Azure Blob Storage

    Client->>API: POST /api/files/initiate (filename, totalChunks, hash)
    activate API
    API->>API: Deduplicate (Check hash)
    alt Hash Exists
        API-->>Client: 200 OK (Upload Complete)
    else New File
        API->>DB: Create Session (Status = Pending)
        API-->>Client: 200 OK (sessionId)
    end
    deactivate API

    loop For each chunk
        Client->>API: POST /api/files/upload/{sessionId}
        activate API
        API->>Blob: Save chunk to Blob Storage
        API->>DB: Log chunk as uploaded
        API-->>Client: 200 OK
        deactivate API
    end

    Client->>API: POST /api/files/complete/{sessionId}
    activate API
    API->>DB: Validate all chunks uploaded
    API->>DB: Update Session Status = Complete
    API-->>Client: 200 OK (FileMetadata)
    deactivate API
```

## 4. Real-Time Sync Flow

Real-time synchronization uses SignalR to allow the client to instantly react to file updates made from other devices or browsers.

```mermaid
sequenceDiagram
    participant App1 as Web Client 1
    participant API
    participant Hub as SignalR Hub
    participant App2 as Web Client 2

    App1->>API: POST /api/files/upload (New File)
    API-->>App1: 200 OK
    API->>Hub: Publish SyncEvent (File_Created)
    Hub-->>App2: FileUpdateEvent (Push Notification)
    App2->>API: GET /api/files/stats (or) /api/sync/delta
    API-->>App2: File Info
    App2->>App2: Update UI state
```

## 5. Entity Relationship Model

A simplified view of how entities relate to one another in the PostgreSQL database.

```mermaid
erDiagram
    USERS ||--o{ REFRESH_TOKENS : has
    USERS ||--o{ DEVICES : owns
    USERS ||--o{ FILE_METADATA : owns
    FILE_METADATA ||--o{ FILE_CHUNKS : contains
    FILE_METADATA ||--o{ FILE_PERMISSIONS : has
    USERS ||--o{ FILE_PERMISSIONS : granted_to

    USERS {
        uuid Id PK
        string Username
        string Email
        string PasswordHash
    }
    FILE_METADATA {
        uuid Id PK
        uuid OwnerId FK
        string FileName
        long FileSize
        string MimeType
    }
    FILE_CHUNKS {
        uuid Id PK
        uuid FileMetadataId FK
        int ChunkIndex
        long Size
    }
```
