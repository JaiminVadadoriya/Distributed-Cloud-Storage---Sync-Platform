# Services and Dependency Injection

Dependency Injection (DI) is the primary way we manage dependencies and ensure testability.

## Service Scopes

Choose the appropriate lifetime for your services:

- **Transient**: Created each time they are requested. Use for lightweight, stateless services.
- **Scoped**: Created once per client request (within an HTTP lifecycle). **Default for most services** (especially those using `ApplicationDbContext`).
- **Singleton**: Created once and shared for the lifetime of the application. Use for caches (Redis, memory cache) or stateless utilities.

## Interface-Based Design

All services must be accessed via interfaces to allow for mocking in unit tests.

### Implementation Pattern:
1. Define interface in `CloudStorage.Application/Interfaces`:
   ```csharp
   public interface IAdminService { ... }
   ```
2. Implement in `CloudStorage.Infrastructure/Services`:
   ```csharp
   public class AdminService(ApplicationDbContext context) : IAdminService { ... }
   ```
3. Register in `CloudStorage.API/Program.cs`:
   ```csharp
   builder.Services.AddScoped<IAdminService, AdminService>();
   ```

## Primary Constructors
With .NET 10/C# 14, always prefer **Primary Constructors** for DI to reduce boilerplate.

```csharp
public class FileService(IAdminService adminService, ILogger<FileService> logger) : IFileService
{
    public async Task ProcessFileAsync(...) 
    {
        logger.LogInformation("Processing...");
        await adminService.LogActivityAsync();
    }
}
```

## Resilience and Fault Tolerance
For services interacting with external systems (Azure, Redis), use **Polly** for retry policies. Configure these in the `Infrastructure` layer during service registration.

## Logging
Inject `ILogger<T>` into your services. Favor structured logging to ensure readability in Prometheus/Grafana.
```csharp
_logger.LogInformation("Processing chunk {ChunkIndex} for file {FileId}", chunkIndex, fileId);
```
