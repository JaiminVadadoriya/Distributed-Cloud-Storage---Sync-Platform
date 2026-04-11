# CloudStorage Testing Guide

Complete guide for running, understanding, and maintaining the CloudStorage test suite.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Architecture](#test-architecture)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Infrastructure](#test-infrastructure)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- **Docker & Docker Compose** - For test environment
- **Node.js 18+** - For frontend tests
- **.NET 8 SDK** - For backend tests
- **PowerShell** (Windows) or **Bash** (Linux/Mac)

### Run All Tests (5-10 minutes)

```bash
cd d:\college\cloud-storage
bash scripts/run-tests-all.sh
```

Or use PowerShell:

```powershell
cd d:\college\cloud-storage
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\scripts\run-tests-all.ps1
```

### Quick Test Run (Mock Frontend, Skip Backend)

```bash
cd CloudStorage.Client
npm run e2e
```

---

## Test Architecture

### Three-Layer Testing Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Tests (Playwright)                   │
│   ┌──────────────┬──────────────┬──────────────────────┐   │
│   │   Admin      │ Regular User │  Guest/Shared        │   │
│   │  Personas    │  Personas    │  User Personas       │   │
│   └──────────────┴──────────────┴──────────────────────┘   │
│   ┌──────────────┬──────────────┬──────────────────────┐   │
│   │ Resilience   │ Performance  │  Accessibility       │   │
│   │ Tests        │  Tests       │  Tests               │   │
│   └──────────────┴──────────────┴──────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌────────────────┐    Frontend Unit Tests (Vitest)      │
│   │  Services      │    ┌──────────────────────────────┐  │
│   │  Components    │    │ - Directives                 │  │
│   │  Store/State   │    │ - Pipes                      │  │
│   └────────────────┘    │ - Guards                     │  │
│                         └──────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│        Backend Tests (.NET - xUnit / NUnit)                │
│   ┌────────────────┬──────────────┬──────────────────┐    │
│   │  Domain        │ Application  │  Infrastructure  │    │
│   │  Entity Tests  │  Service     │  Repository      │    │
│   │                │  Tests       │  Tests           │    │
│   └────────────────┴──────────────┴──────────────────┘    │
│   ┌────────────────────────────────────────────────────┐    │
│   │  API Integration Tests (Real DbContext)           │    │
│   │  - Controller endpoints                           │    │
│   │  - Request/Response validation                    │    │
│   └────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Test Infrastructure (Docker, Fixtures, Builders)          │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
CloudStorage/
├── CloudStorage.Client/
│   ├── e2e/
│   │   ├── personas/
│   │   │   ├── admin/                    # Admin persona tests
│   │   │   ├── regularUser/             # Regular user flows
│   │   │   ├── guest/                   # Guest/shared user tests
│   │   │   ├── resilience/              # Network failures, offline
│   │   │   ├── performance/             # Load, large files
│   │   │   └── accessibility/           # WCAG, mobile, keyboard
│   │   ├── fixtures/                    # Playwright fixtures
│   │   ├── helpers/                     # UI & API helpers
│   │   ├── data/                        # Test data (users, files, etc)
│   │   ├── utils/                       # Global setup/teardown
│   │   └── playwright.config.ts        # Playwright configuration
│   ├── src/
│   │   └── **/*.spec.ts                # Vitest unit tests
│   └── package.json                    # Test npm scripts
├── tests/
│   ├── CloudStorage.Domain.Tests/
│   ├── CloudStorage.Application.Tests/
│   ├── CloudStorage.Infrastructure.Tests/
│   └── CloudStorage.API.Tests/
├── scripts/
│   ├── run-tests-all.sh               # Run complete suite
│   ├── run-e2e-tests.sh              # Run E2E tests only
│   ├── run-backend-tests.sh          # Run backend tests only
│   └── run-unit-tests.sh             # Run frontend units only
├── docker-compose.test.yml           # Test infrastructure
└── playwright.config.ts              # E2E configuration
```

---

## Running Tests

### Frontend E2E Tests

#### All E2E Tests (Mock APIs)

```bash
cd CloudStorage.Client
npm run e2e
```

#### E2E Tests Against Real Backend

```bash
# Start test environment first
docker-compose -f docker-compose.test.yml up -d

# Run tests
TEST_MODE=real npm run e2e

# Or specific persona
npm run e2e:admin        # Admin tests
npm run e2e:user        # Regular user tests
npm run e2e:guest       # Guest/shared tests
npm run e2e:resilience  # Network resilience
npm run e2e:perf        # Performance tests
npm run e2e:a11y        # Accessibility tests
npm run e2e:mobile      # Mobile viewports
```

#### E2E Tests with Debugging

```bash
# UI test viewer (interactive)
npm run e2e:ui

# Headed browser with debugger
npm run e2e:debug

# Generate and view report
npm run e2e:report
```

#### E2E Tests with Specific Criteria

```bash
# Run single file
npx playwright test e2e/personas/regularUser/core-flows.spec.ts

# Run specific test
npx playwright test -g "User can upload a small file"

# Run with specific browser
npx playwright test --project=firefox

# Run with trace
npx playwright test --trace on
```

### Frontend Unit Tests

```bash
# Run all unit tests
cd CloudStorage.Client
npm run test

# Watch mode (auto-rerun on changes)
npm run test:watch

# UI test viewer
npm run test:ui

# With coverage report
npm run test:ci
```

### Backend Unit & Integration Tests

#### All Backend Tests

```bash
cd tests/CloudStorage.Domain.Tests
dotnet test --configuration Release

cd ../CloudStorage.Application.Tests
dotnet test --configuration Release

cd ../CloudStorage.Infrastructure.Tests
dotnet test --configuration Release

cd ../CloudStorage.API.Tests
dotnet test --configuration Release
```

#### Specific Test Class

```bash
dotnet test --filter ClassName=CloudStorage.Domain.Tests.Entities.UserEntityTests
```

#### With Code Coverage

```bash
dotnet test /p:CollectCoverage=true /p:CoverageFormat=opencover
```

### Complete Test Suite

```bash
# Run everything (10-15 minutes)
bash scripts/run-tests-all.sh
```

---

## Writing Tests

### E2E Test Template (Playwright)

```typescript
import { test, expect } from '../../fixtures/auth.fixture';
import { createApiClient } from '../../helpers/api-client';
import { setupTestUser, getTestUserCredentials, setupAuthToken } from '../../helpers/test-setup';

test.describe.parallel('Feature - Operations', () => {
  let apiClient: ReturnType<typeof createApiClient>;

  test.beforeEach(async ({ authenticatedPage, apiBase }) => {
    // Setup: Create user and login
    const credentials = getTestUserCredentials('regularUser1');
    let userAuth = await loginTestUser(authenticatedPage, apiBase, credentials.username, credentials.password)
      .catch(async () => setupTestUser(authenticatedPage, apiBase, 'regularUser1'));

    await setupAuthToken(authenticatedPage, userAuth.token);
    apiClient = createApiClient(authenticatedPage, apiBase);
    
    // Navigate to page
    await authenticatedPage.goto('/feature-page');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('User can perform action', async ({ authenticatedPage }) => {
    // Act
    await authenticatedPage.click('[data-testid="action-button"]');

    // Assert
    await expect(authenticatedPage.locator('[data-testid="result"]')).toBeVisible();
  });

  test('Operation shows error on API failure', async ({ authenticatedPage }) => {
    // Arrange: Mock API error
    await authenticatedPage.route('**/api/endpoint', route => route.abort());

    // Act
    await authenticatedPage.click('[data-testid="action-button"]');

    // Assert
    const errorMsg = authenticatedPage.locator('[role="alert"]');
    await expect(errorMsg).toBeVisible();
  });
});
```

### API Client Usage in Tests

```typescript
// Get list of items
const response = await apiClient.listFiles(parentFolderId);
if (response.status !== 200) {
  console.error('API error:', response.error);
}

// Create resource
const createResponse = await apiClient.createFolder('New Folder', parentId);
expect(createResponse.status).toBe(200);
expect(createResponse.data?.folderId).toBeTruthy();
```

### Backend Unit Test Template (.NET / xUnit)

```csharp
using Xunit;
using CloudStorage.API.Tests.Fixtures;
using CloudStorage.API.Tests.Builders;

public class FileServiceTests : BaseIntegrationTest
{
    [Fact]
    public async Task UploadFile_WithValidData_ReturnsSuccess()
    {
        // Arrange
        var user = new UserBuilder().WithId(1).Build();
        await DbContext.Users.AddAsync(user);
        await SaveChangesAsync();

        var fileData = new FileMetadataBuilder()
            .WithOwnerId(user.Id)
            .WithFileName("test.txt")
            .Build();

        // Act
        await DbContext.FileMetadata.AddAsync(fileData);
        await SaveChangesAsync();

        // Assert
        var savedFile = await DbContext.FileMetadata.FindAsync(fileData.Id);
        Assert.NotNull(savedFile);
        Assert.Equal("test.txt", savedFile.FileName);
    }

    [Fact]
    public async Task UploadFile_WithDuplicateHash_ReturnsDeduplicated()
    {
        // Test deduplication logic
    }
}
```

---

## Test Infrastructure

### Docker Test Environment

```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Check service status
docker-compose -f docker-compose.test.yml ps

# View logs
docker-compose -f docker-compose.test.yml logs api

# Stop and clean
docker-compose -f docker-compose.test.yml down -v
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5434 | Test database |
| Redis | 6380 | Cache/SignalR backplane |
| RabbitMQ | 5673 | Message queue |
| Azurite | 10010-10012 | Blob storage mock |
| NGINX | 5010 | Load balancer |

### Test Data Setup

```typescript
// Create test user via API
const userAuth = await setupTestUser(page, apiBase, 'regularUser1');

// Login and authenticate
await setupAuthToken(page, userAuth.token);

// Create folder structure
const folderIds = await setupFolderStructure(page, apiBase, userAuth.token);

// Cleanup after test
await cleanupTestData(page, apiBase, userAuth.token);
```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: CloudStorageDb_Test
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0'
      
      - run: bash scripts/run-backend-tests.sh

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - working-directory: CloudStorage.Client
        run: npm ci && npm run test:ci

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - working-directory: CloudStorage.Client
        run: npm ci && npm run e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: CloudStorage.Client/playwright-report/
```

---

## Troubleshooting

### Common Issues

#### 1. Docker Services Not Starting

```bash
# Check Docker daemon
docker ps

# View logs
docker-compose -f docker-compose.test.yml logs

# Rebuild images
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml build --no-cache
docker-compose -f docker-compose.test.yml up -d
```

#### 2. Database Connection Errors

```bash
# Verify database is accessible
docker exec postgres-test psql -U postgres -d CloudStorageDb_Test -c "SELECT 1"

# Check migrations applied
dotnet ef database update -p CloudStorage.Infrastructure
```

#### 3. E2E Tests Timing Out

```bash
# Check if frontend is running on port 4200
curl http://localhost:4200

# Check if API is running on port 5010
curl http://localhost:5010/api/health

# Increase timeout in playwright.config.ts
// timeout: 90000 for real backend tests
```

#### 4. Flaky Tests

- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Check for race conditions in async operations
- Increase retry count in playwright.config.ts
- Review logs for timing issues

#### 5. Authentication Errors

```bash
# Verify JWT configuration matches test setup
# Check JwtTokenHelper.GetTestSecret() matches appsettings

# Verify test user creation
# Check test database has users table
docker exec postgres-test psql -U postgres -d CloudStorageDb_Test -c "SELECT * FROM public.\"Users\""
```

### Debug Mode

```bash
# Frontend debug mode
TEST_MODE=real DEBUG=1 npm run e2e:debug

# Backend debug (VS Code)
dotnet test --no-build -- --diag output.log

# Database logging
# Add to DbContext:
LogTo(Console.WriteLine, LogLevel.Information)
```

### Performance Profiling

```bash
# Frontend performance trace
npx playwright test --trace on

# Backend performance
dotnet test /p:CollectCoverage=true /p:CoverageFormat=opencover

# View traces
npx playwright show-trace trace.zip
```

---

## Best Practices

1. **Use Page Objects** - Encapsulate selectors in helper methods
2. **Async/Await** - Always await async operations
3. **Descriptive Test Names** - Use `test('User can ...')` format
4. **Single Responsibility** - One assertion per test when possible
5. **Setup/Teardown** - Use `beforeEach`/`afterEach` appropriately
6. **Data Builders** - Use fluent builders for test data
7. **Mocking** - Mock external APIs in unit tests
8. **Retry Logic** - Add retry for flaky network operations
9. **Screenshots/Traces** - Enable for CI failures
10. **Documentation** - Keep test data README updated

---

## Metrics & Reporting

### Coverage Reports

```bash
# Frontend coverage
npm run test:ci
# View: CloudStorage.Client/coverage/index.html

# Backend coverage
dotnet test /p:CollectCoverage=true
# Reports generated in each test project
```

### Test Reporting

- **Playwright HTML Report**: `npm run e2e:report`
- **Vitest UI**: `npm run test:ui`
- **JUnit XML**: `test-results.xml` (for CI)
- **JSON Report**: `test-results.json`

---

## Support & Questions

For issues or questions about the test suite:

1. Check Troubleshooting section above
2. Review test documentation in test files
3. Check GitHub Actions logs for CI failures
4. Run tests locally with debug flags
