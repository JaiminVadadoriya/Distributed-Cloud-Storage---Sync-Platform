# Clean Architecture in CloudStorage

This project follows a strict Clean Architecture (Onion Architecture) pattern to ensure high testability, maintainability, and independence from external frameworks.

## Project Layers

### 1. CloudStorage.Domain (Core)
- **Role**: Contains the "heart" of the application—business entities and logic.
- **Rules**: Must NOT depend on any other project or external library (except essential C# libraries).
- **Contents**: 
  - Entities (e.g., `User`, `FileMetadata`, `Folder`)
  - Value Objects
  - Domain Events
  - Domain-specific interfaces.

### 2. CloudStorage.Application (Use Cases)
- **Role**: Implements the business workflows. Coordinates between Domain and Infrastructure.
- **Rules**: Depends only on `Domain`.
- **Contents**:
  - Service Interfaces (e.g., `IFileService`, `IAuthService`)
  - DTOs (e.g., `LoginDto`, `FileUpdateDto`)
  - Business logic orchestrators.

### 3. CloudStorage.Infrastructure (Implementation)
- **Role**: Provides concrete implementations for `Application` interfaces.
- **Rules**: Depends on `Application` and `Domain`. Accesses DBs, file systems, and external APIs.
- **Contents**:
  - `ApplicationDbContext` (EF Core)
  - Repositories
  - Service Implementations (e.g., `BlobChunkStorageService.cs`)
  - Third-party integrations (Azure, Redis, RabbitMQ).

### 4. CloudStorage.API (Entry Point)
- **Role**: The host of the application. Handles HTTP/SignalR and configuration.
- **Rules**: Depends on all other layers to perform Dependency Injection setup.
- **Contents**:
  - Controllers
  - SignalR Hubs
  - Program.cs / Configuration
  - Authorization handlers and filters.

## Dependency Flow
All dependencies point **inwards** towards the Domain.

`API` --> `Infrastructure` / `Application` --> `Domain`

## Best Practices
- **Strict Separation**: Do not pass EF Core entities directly through the API. Use DTOs.
- **Abstraction**: Always inject interfaces (`IFileService`), not implementations (`FileService`).
- **Domain logic**: If a rule applies to the entity regardless of the UI, put it in the `Domain` layer.
