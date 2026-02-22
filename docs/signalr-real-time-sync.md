# Real-Time Synchronization with SignalR

This document outlines the architecture and implementation of real-time file synchronization in the Cloud Storage application. The goal is to provide instant updates across all of a user's devices when file changes (uploads or deletions) occur, eliminating the need for manual browser refreshes.

## Architecture Overview

The real-time synchronization feature is built using **ASP.NET Core SignalR** on the backend and the `@microsoft/signalr` client library in Angular. The system pushes events to specific users, ensuring that a user only receives notifications relevant to their own file storage.

### 1. Backend: ASP.NET Core SignalR Hub

- **`FileStorageHub`**: The central component for real-time communication. It is mapped to the `/hubs/storage` endpoint.
- **Authentication**: SignalR connections are authenticated using JWT. Because standard HTTP headers are not always supported (e.g., in WebSockets in browsers), the API is configured to extract the JWT from the `access_token` query string parameter during negotiation.
- **User Groups**: Upon connection (`OnConnectedAsync`), the user's ID is extracted from the JWT claims, and their connection is added to a SignalR group named `user_{userId}`. This allows targeting notifications to all connected devices belonging to a specific user.

### 2. Backend: Notification Infrastructure

- **`INotificationService`**: Defines the contract for sending real-time events.
- **`SignalRNotificationService`**: Implements the interface using `IHubContext<FileStorageHub>`. When an action occurs (like a successful chunk upload completion or a file deletion), the controllers (`ChunkUploadController`, `FilesController`) call this service.
- **`FileEventDto`**: The standardized payload sent over the WebSocket connection. It includes:
  - `FileId`: The ID of the affected file.
  - `FileName`: Nullable, the name of the file (used for upload events).
  - `Size`: Nullable, the size of the file.
  - `EventType`: The string event type (`"FileUploaded"`, `"FileDeleted"`, `"AllFilesDeleted"`).
  - `Timestamp`: UTC timestamp of the event.
  - `OwnerId`: The ID of the file owner.

### 3. Backend: Delta Synchronization

To optimize bandwidth, especially for offline/reconnecting clients, a delta sync endpoint was implemented.
- **`DeltaSyncController`**: Exposes `GET /api/sync/delta?sinceUtc={timestamp}`.
- **`DeltaSyncService`**: Queries the `FileMetadata` database to efficiently return a list of files created, modified, or logically deleted since the provided timestamp. This allows clients to fetch only what has changed instead of retrieving their entirely file list upon reconnection.

### 4. Frontend: Angular SignalR Client

- **`SignalRService`**: A singleton service responsible for managing the SignalR `HubConnection`.
  - It uses `withAutomaticReconnect` for exponential backoff during temporary network disconnections.
  - It exposes RxJS Observables (`fileUploaded$`, `fileDeleted$`, `allFilesDeleted$`) that other components can subscribe to.
- **`DashboardComponent`**: Subscribes to the `SignalRService` observables. When an event fires, it automatically triggers an API refresh via `fileList.loadFiles()` and updates the storage statistics, providing a seamless "live" feel to the user.

### 5. Frontend: Notification Toast UI

To provide explicit visual feedback on real-time events, a custom notification system was added:
- **`NotificationService`**: Manages a queue of global alerts (`success`, `info`, `warning`, `error`).
- **`NotificationToastComponent`**: Uses Angular animations (`@angular/animations`) to display sliding toast notifications in the bottom right corner of the screen.

## Event Flow

1. User A initiates a file upload via the Dashboard.
2. The Angular client chunks the file and sends it to `ChunkUploadController`.
3. Upon all chunks being verified, `CompleteUpload` updates the DB to mark the file as `Complete`.
4. `ChunkUploadController` calls `_notificationService.NotifyFileUploadedAsync(...)`.
5. `SignalRNotificationService` broadcasts a `FileEventDto` to the group `user_{UserA_ID}`.
6. User A's *other* browser tab (or another device) receives the `FileEvent` via the active SignalR websocket.
7. The `SignalRService` on the other tab emits the event through the `fileUploaded$` observable.
8. The `DashboardComponent` receives the event, displays a success toast notification ("File uploaded: example.txt"), and reloads the file list and stats.

## Future Considerations

- **Delta Sync Integration**: The frontend currently refreshes the full file list upon receiving a SignalR event. Future optimizations could wire the `DeltaSyncController` into the frontend, using the `sinceUtc` token to specifically inject or remove items from the local state list.
- **Offline Mode Support**: Combining Delta Sync with IndexedDB to support true offline persistence.
