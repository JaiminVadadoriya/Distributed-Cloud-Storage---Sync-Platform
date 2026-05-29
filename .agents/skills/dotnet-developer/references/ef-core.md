# Entity Framework Core 10 Guidelines

This project uses EF Core 10 for PostgreSQL. Proper configuration ensures performance and data integrity.

## DbContext Patterns

- **Fluent API**: Prefer `OnModelCreating` configuration over Data Annotations to keep Domain entities clean.
- **Service Registration**: Registered as `AddDbContextPool` in `Program.cs` for performance.
- **Warnings**: Configure warnings to log instead of throw for non-critical issues (done in `ApplicationDbContext.cs`).

## Query Optimization

### 1. Read-Only Queries
Always use `.AsNoTracking()` for queries that only return data for the UI without any intention to update the entities.
```csharp
var users = await _context.Users.AsNoTracking().ToListAsync();
```

### 2. Projections
Prefer projecting to DTOs using `.Select()` to avoid fetching unnecessary columns.
```csharp
var fileList = await _context.FileMetadata
    .Where(f => f.OwnerId == userId)
    .Select(f => new FileSummaryDto { Name = f.FileName, Size = f.Size })
    .ToListAsync();
```

### 3. Eager Loading
Use `.Include()` and `.ThenInclude()` only when necessary. For complex scenarios, consider multiple queries if it reduces data duplication (Cartesian explosion).

## Migrations Workflow
Always run migrations from the root folder specifying the infrastructure project:

**Add Migration:**
```bash
dotnet ef migrations add <Name> --project CloudStorage.Infrastructure --startup-project CloudStorage.API
```

**Update Database:**
```bash
dotnet ef database update --project CloudStorage.Infrastructure --startup-project CloudStorage.API
```

## Conventions
- **Naming**: Use PascalCase for properties. EF Core handles the mapping to snake_case in PostgreSQL.
- **Indices**: Define indices for any column used in `Where` or `OrderBy` clauses, especially foreign keys.
- **Soft Deletes**: Use the `IsDeleted` flag where history must be preserved.
