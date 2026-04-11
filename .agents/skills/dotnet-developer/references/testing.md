# Testing Guidelines

We prioritize high test coverage (aiming for 100% on critical logic) using a modern xUnit stack.

## Testing Stack

- **Framework**: xUnit
- **Assertion Library**: FluentAssertions (recommended)
- **Mocking**: Moq or NSubstitute
- **Data Factories**: AutoFixture for generating test data.

## Project Structure

Tests are located in the `tests/` directory, mirroring the solution structure:
- `CloudStorage.Domain.Tests`
- `CloudStorage.Application.Tests`
- `CloudStorage.Infrastructure.Tests`
- `CloudStorage.API.Tests`

## Best Practices

### 1. Naming
Follow the `UnitOfWork_StateUnderTest_ExpectedBehavior` pattern.
```csharp
[Fact]
public async Task UploadFile_WithValidData_ReturnsSuccess() { ... }
```

### 2. Isolation
Unit tests must NOT touch the database or external APIs. Use mocks for `ApplicationDbContext` and external services.

### 3. DbContext Mocking
For tests that strictly require database logic (e.g., repository tests), use the **EF Core In-Memory Provider** or **SQLite In-Memory**.

### 4. Integration Tests
Use `WebApplicationFactory<Program>` in `CloudStorage.API.Tests` to run full integration tests against a test server.

## Execution
Run all tests locally before pushing:
```bash
dotnet test
```
To run tests with code coverage analysis:
```bash
dotnet test /p:CollectCoverage=true
```
