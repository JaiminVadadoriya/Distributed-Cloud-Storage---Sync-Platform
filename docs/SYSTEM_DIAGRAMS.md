# System Architecture Diagrams

This document contains visual representations of the system architecture for the Distributed Cloud Storage Platform.

## 1. High-Level Architecture

The system utilizes a split frontend/backend architecture, with the backend built on .NET 10 and PostgreSQL, and the frontend on Angular 21.

```mermaid
graph TD
    subgraph Client Layer
        Web[Angular Web App]
    end

    subgraph API Layer
        LB[NGINX Load Balancer]
        API["CloudStorage.API - .NET 10 (x3 replicas)"]
        Hub[SignalR Storage Hub]
    end

    subgraph Infrastructure Layer
        DB[(PostgreSQL 16)]
        MinIO[(MinIO / S3 Storage)]
        Redis[(Redis 7)]
        RMQ[[RabbitMQ 3]]
    end

    subgraph Observability
        OTel[OTel Collector]
        Prom[Prometheus]
        Loki[Loki]
        Jaeger[Jaeger]
        Graf[Grafana]
    end

    Web -->|HTTPS| LB
    LB -->|Round Robin| API
    Web <-->|WebSockets| Hub

    API -->|EF Core| DB
    API -->|S3 SDK| MinIO
    API <-->|Backplane| Redis
    API -->|Publish| RMQ
    Hub -->|EF Core| DB

    API -.->|Telemetry| OTel
    OTel -.-> Prom & Loki & Jaeger
    Prom & Loki & Jaeger -.-> Graf
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

File uploads are handled by breaking the file into 5MB chunks and uploading them to MinIO (S3-compatible) or processed by the backend if local storage is used.

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB as PostgreSQL
    participant Storage as MinIO / S3 Storage

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
        Client->>API: POST /api/files/chunks
        activate API
        API->>Storage: Save chunk to Object Storage
        API->>DB: Log chunk as uploaded
        API-->>Client: 200 OK
        deactivate API
    end

    Client->>API: POST /api/files/complete
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
    USERS ||--o{ PASSWORD_RESET_TOKENS : has
    USERS ||--o{ DEVICES : owns
    USERS ||--o{ FILE_METADATA : owns
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ ACTIVITY_LOGS : generates
    FILE_METADATA ||--o{ FILE_CHUNKS : contains
    FILE_METADATA ||--o{ FILE_PERMISSIONS : has
    FILE_METADATA ||--o{ SYNC_EVENTS : tracked_by
    FILE_METADATA ||--o{ STORAGE_OBJECT_LIFECYCLE : has_lifecycle
    USERS ||--o{ FILE_PERMISSIONS : granted_to
    USERS ||--o{ FOLDERS : owns
    FOLDERS ||--o{ FOLDER_PERMISSIONS : has
    USERS ||--o{ FOLDER_PERMISSIONS : granted_to
    FOLDERS ||--o{ FOLDERS : contains
    FOLDERS ||--o{ FILE_METADATA : contains
    DEVICES ||--o{ SYNC_EVENTS : generates

    USERS {
        int Id PK
        string Username
        string Email
        string PasswordHash
        string Role
        bool IsActive
        long StorageQuota
    }
    FILE_METADATA {
        uuid Id PK
        int OwnerId FK
        string FileName
        long Size
        string ContentType
        int Version
        uuid ParentVersionId FK
        string UploadStatus
        bool IsDeleted
    }
    FILE_CHUNKS {
        uuid Id PK
        uuid FileMetadataId FK
        int ChunkIndex
        string Hash
        long Size
        bool IsDuplicate
    }
    FOLDERS {
        uuid Id PK
        string Name
        int OwnerId FK
        uuid ParentFolderId FK
    }
    NOTIFICATIONS {
        uuid Id PK
        int UserId FK
        string Type
        string Title
        string Message
        bool IsRead
    }
    STORAGE_OBJECT_LIFECYCLE {
        uuid Id PK
        uuid FileId FK
        string StorageTier
        datetime LastAccessedAt
    }
```

## 6. Distributed Scale-Out Infrastructure

This diagram illustrates how the system handles ~12,000 concurrent users using a load-balanced cluster and background message processing.

```mermaid
graph LR
    User([End User]) --> |HTTPS| LB[NGINX Load Balancer]
    
    subgraph "API Cluster"
        API1[API Instance 1]
        API2[API Instance 2]
        API3[API Instance 3]
    end

    LB --> |Round Robin| API1
    LB --> |Round Robin| API2
    LB --> |Round Robin| API3

    API1 & API2 & API3 <--> |SignalR Backplane| Redis[(Redis)]
    API1 & API2 & API3 --> |Async Tasks| RMQ[[RabbitMQ]]
    API1 & API2 & API3 <--> |Persistence| DB[(PostgreSQL)]
    API1 & API2 & API3 <--> |Chunks| MinIO[(MinIO / S3)]

    subgraph "Background Workers"
        Worker[Worker Threads]
    end

    RMQ --> Worker
    Worker --> DB
    Worker --> MinIO

    subgraph "Observability Stack"
        OTel[OTel Collector]
        Prom[Prometheus]
        Loki[Loki]
        Jaeger[Jaeger]
        Graf[Grafana]
    end

    API1 & API2 & API3 -.-> |OTLP| OTel
    OTel -.-> Prom & Loki & Jaeger
    Prom & Loki & Jaeger -.-> Graf

    subgraph "Email"
        Mailpit[Mailpit SMTP]
    end

    API1 & API2 & API3 -.-> |SMTP| Mailpit
```
