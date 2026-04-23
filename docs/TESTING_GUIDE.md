# CloudStorage Testing Guide

This guide covers the comprehensive testing suite for CloudStorage, including E2E, Unit, and Integration tests.

## Architecture

The testing suite is divided into three layers:
1.  **E2E (Playwright)**: Persona-based tests running against a real Docker backend.
2.  **Integration (xUnit + WebApplicationFactory)**: Backend API tests with a real database.
3.  **Unit (xUnit & Vitest)**: Fast, isolated tests for domain logic and frontend components.

## Prerequisites

-   Docker & Docker Compose
-   Node.js (v20+)
-   .NET 10 SDK
-   Playwright Browsers (`npx playwright install`)

## Running Tests

### 1. Full Suite
Run everything (Warning: takes ~10-15 mins):
```bash
bash scripts/run-tests-all.sh
```

### 2. Frontend E2E (Playwright)
Ensure the test backend is running first:
```bash
docker-compose -f docker-compose.test.yml up -d
```

Run specific personas:
```bash
npm run e2e:user     # Regular User flows
npm run e2e:admin    # Admin Panel & User Mgmt
npm run e2e:resilience # Network failure handling
npm run e2e:a11y     # Accessibility scans
```

### 3. Backend Tests (.NET)
```bash
dotnet test tests/CloudStorage.API.Tests         # Integration
dotnet test tests/CloudStorage.Domain.Tests      # Unit
dotnet test tests/CloudStorage.Application.Tests # Service/Mock
```

### 4. Frontend Unit Tests (Vitest)
```bash
npm run test          # Run all vitest specs
npm run test:ui       # Run with Vitest UI
```

## Adding New Tests

### E2E
Tests are organized by persona in `e2e/personas/`. Use the `users.json` file for credentials.
Always use `data-testid` selectors for stability.

### Backend Builders
Use the fluent builders in `tests/Builders/` to create test data consistently:
```csharp
var user = new UserBuilder().Admin().WithUsername("tester").Build();
```

### Accessibility
Accessibility tests use `axe-core`. Add scans for new features in `e2e/personas/accessibility/`.

## CI/CD
Tests run automatically on every Pull Request. Results and videos are archived in Playwright's HTML report.
