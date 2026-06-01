---
name: dotnet-developer
description: Provides architectural and technical guidance for the .NET 10.0 backend. Trigger when creating entities, services, controllers, or for best practices on EF Core, Clean Architecture, Dependency Injection, Observability (OTEL), and testing.
license: MIT
metadata:
  author: Antigravity
  version: '1.0'
---

# .NET Developer Guidelines

1. **Version Target**: Always target **.NET 10.0** and C# 14 (pre-release features if enabled). Use file-scoped namespaces, global usings, and primary constructors where appropriate.

2. **Architecture**: Adhere to the **Clean Architecture** pattern established in the project:
   - **Domain**: Pure entities, value objects, and domain exceptions. No external dependencies.
   - **Application**: DTOs, interfaces, business logic (Services/Commands).
   - **Infrastructure**: Data access (EF Core), external services (Azure Blob, Redis, RabbitMQ), and migrations.
   - **API**: Controllers, SignalR Hubs, Middleware, and Program.cs configuration.

3. **Code Verification**: After making changes, ensure the code compiles by running `dotnet build`. Verify logic with `dotnet test`.

## Core References

Consult the following internal references for specific tasks:

- **Architecture**: Deep dive into layers and project dependencies. Read [architecture.md](references/architecture.md)
- **Data Persistence (EF Core)**: Guidelines for DbContext, Fluent API, and migrations. Read [ef-core.md](references/ef-core.md)
- **Services & DI**: Scoping rules and implementation patterns. Read [services-and-di.md](references/services-and-di.md)
- **Observability**: OpenTelemetry, Metrics, and Health Checks. Read [observability.md](references/observability.md)
- **Testing**: xUnit, Moq, and integration testing patterns. Read [testing.md](references/testing.md)

## Common Workflows

### Adding a New Entity
1. Define the entity in `CloudStorage.Domain/Entities`.
2. Register the `DbSet` and configure associations in `CloudStorage.Infrastructure/Data/ApplicationDbContext.cs`.
3. Create a migration: `dotnet ef migrations add Add[EntityName] --project CloudStorage.Infrastructure --startup-project CloudStorage.API`.
4. Update the DB: `dotnet ef database update --project CloudStorage.Infrastructure --startup-project CloudStorage.API`.

### Implementing Business Logic
1. Define the interface in `CloudStorage.Application/Interfaces`.
2. Create DTOs in `CloudStorage.Application/DTOs`.
3. Implement the service in `CloudStorage.Infrastructure/Services` (or `Application/Services` if strictly business logic).
4. Register the service in `CloudStorage.API/Extensions/ServiceCollectionExtensions.cs` or `Program.cs`.

## Performance & Best Practices

- **Asynchronous Code**: Always use `async/await` for IO-bound operations. Prefer `ValueTask` for methods that often return synchronously.
- **Null Safety**: Leverage C# nullable reference types. Avoid `!`, use null-coalescing or guards.
- **EF Core Optimization**: Use `.AsNoTracking()` for read-only queries. Avoid N+1 queries by using `.Include()`.
- **Primary Constructors**: Use primary constructors for dependency injection in classes/records.

If you require documentation on specific .NET APIs, visit `https://learn.microsoft.com/en-us/dotnet/`.
