# CloudStorage Testing Guide

This document outlines the three-layered testing architecture for the CloudStorage system, including persona-based E2E scenarios, API integration tests, and frontend/backend unit tests.

## 🏗️ Test Architecture

The system uses a pyramid-style testing strategy:

1.  **Level 1: Unit Tests** (Fast, isolated)
    *   **Backend**: xUnit tests for Domain and Application layers.
    *   **Frontend**: Vitest tests for components and services.
2.  **Level 2: Integration Tests** (Middleware & DB)
    *   **Backend**: WebApplicationFactory tests with In-Memory SQLite and Authentication bypass (`TestAuthHandler`).
3.  **Level 3: Persona E2E Tests** (User-centric, high-fidelity)
    *   Playwright tests targeting real user flows (Admin, Regular User, Guest).
    *   Includes Accessibility (a11y), Performance, and Resilience (failure) tests.

---

## 🚀 Running Tests

### 1. Backend Tests
From the root directory:
```bash
dotnet test
```

### 2. Frontend Unit Tests
From `CloudStorage.Client`:
```bash
npm run test:ci
```

### 3. Persona E2E Tests

These tests can run in two modes: `mock` (isolated) and `real` (live system).

#### Mock Mode (Fast)
```bash
npm run e2e
```

#### Real Mode (High-Fidelity)
Requires the Backend and Frontend to be running.
1. Start Backend: 
   ```bash
   # Windows
   $env:SEED_TEST_USERS="true"; dotnet run --project CloudStorage.API
   ```
2. Start Frontend:
   ```bash
   npm run start
   ```
3. Run Persona Tests:
   ```bash
   npm run e2e:real
   ```

---

## 🔍 Specialized E2E Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run e2e:a11y` | Runs WCAG AA compliance audit (Axe-core). |
| `npm run e2e:perf` | Runs large file and concurrent operation benchmarks. |
| `npm run e2e:admin` | Validates Control Plane and User Management flows. |
| `npm run e2e:mobile` | Validates responsive behavior on Pixel and iPhone viewports. |

---

## 🛠️ Environment Configuration

- **API_BASE_URL**: Defaults to `http://localhost:5274` for local testing.
- **FRONTEND_URL**: Defaults to `http://localhost:4200`.
- **SEED_TEST_USERS**: Set to `true` in the API environment to ensure E2E users exist in the Real DB.

---

## 📈 Troubleshooting

- **401 Unauthorized in Integration Tests**: Ensure `WebApplicationFactory` is correctly registering the `TestScheme` handler.
- **Database Conflict**: If `ApplyMigrations` fails during tests, ensure the environment is set to `Testing` to use the SQLite provider.
- **Playwright Timeout**: Real backend tests may take longer; increase the `timeout` in `playwright.config.ts` if running on slow hardware.
