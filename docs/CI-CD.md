# CI/CD Pipeline — Distributed Cloud Storage Platform

> **Version:** 1.0 &nbsp;|&nbsp; **Last Updated:** February 2026

---

## 1. Pipeline Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CI PIPELINE (ci.yml)                             │
│                     Triggers: push/PR to main, develop                      │
│                                                                              │
│  ┌─────────────────────┐   ┌──────────────────────┐                         │
│  │  Backend Build &    │   │  Frontend Build &    │   ← Run in parallel     │
│  │  Test               │   │  Test                │                         │
│  │                     │   │                      │                         │
│  │  • dotnet restore   │   │  • npm ci            │                         │
│  │  • dotnet build     │   │  • npm test (Vitest) │                         │
│  │  • dotnet test (x4) │   │  • ng build --prod   │                         │
│  │  • PostgreSQL svc   │   │                      │                         │
│  └─────────┬───────────┘   └──────────┬───────────┘                         │
│            │                          │                                      │
│            └──────────┬───────────────┘                                      │
│                       ▼                                                      │
│            ┌─────────────────────┐                                           │
│            │  Docker Build &    │   ← Only on push to main                  │
│            │  Push to GHCR      │                                           │
│            │                    │                                           │
│            │  • API image       │                                           │
│            │  • Client image    │                                           │
│            └─────────┬──────────┘                                           │
└──────────────────────┼──────────────────────────────────────────────────────┘
                       │ triggers
┌──────────────────────▼──────────────────────────────────────────────────────┐
│                           CD PIPELINE (cd.yml)                              │
│                    Triggers: on CI success (main only)                       │
│                                                                              │
│  ┌─────────────────────┐     ┌─────────────────────┐     ┌───────────────┐  │
│  │  Deploy to          │────>│  Smoke Tests         │────>│  Deploy to    │  │
│  │  Staging            │     │                      │     │  Production   │  │
│  │                     │     │  • /health           │     │  (manual gate)│  │
│  │  • docker compose   │     │  • /health/ready     │     │               │  │
│  │    pull & up        │     │  • Client URL        │     │               │  │
│  └─────────────────────┘     └──────────────────────┘     └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CI Pipeline (`ci.yml`)

**File:** [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml)

### Trigger Events

| Event        | Branches           | Purpose                    |
| ------------ | ------------------ | -------------------------- |
| `push`       | `main`, `develop`  | Validate merged code       |
| `pull_request` | `main`, `develop` | Gate PRs with quality checks |

### Job 1: Backend Build & Test

Runs on `ubuntu-latest` with a **PostgreSQL 16 service container** for integration tests.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: CloudStorageTestDb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: testpassword
    ports: [5432:5432]
```

**Steps:**

| Step | Command | Purpose |
| ---- | ------- | ------- |
| 1 | `actions/setup-dotnet@v4` | Install .NET 9 SDK |
| 2 | `actions/cache@v4` | Cache NuGet packages (`~/.nuget/packages`) |
| 3 | `dotnet restore` | Restore solution dependencies |
| 4 | `dotnet build --configuration Release` | Compile all projects |
| 5 | `dotnet test` Domain.Tests | Entity & relationship unit tests |
| 6 | `dotnet test` Application.Tests | Service logic tests |
| 7 | `dotnet test` Infrastructure.Tests | Repository & service tests (uses PostgreSQL) |
| 8 | `dotnet test` API.Tests | Controller tests |
| 9 | Upload `.trx` results | Artifact for test reporting |

### Job 2: Frontend Build & Test

Runs in parallel with the backend job.

| Step | Command | Purpose |
| ---- | ------- | ------- |
| 1 | `actions/setup-node@v4` | Install Node.js 22 |
| 2 | `npm ci` | Clean install of dependencies |
| 3 | `npm test -- --run` | Run Vitest in single-run mode |
| 4 | `npm run build -- --configuration production` | Production Angular build |
| 5 | Upload `dist/` | Artifact for deployment |

### Job 3: Docker Build & Push

Only runs on `push` to `main` branch, after both build jobs succeed.

| Step | Action | Purpose |
| ---- | ------ | ------- |
| 1 | `docker/login-action@v3` | Authenticate to GitHub Container Registry |
| 2 | `docker/setup-buildx-action@v3` | Enable multi-platform builds and caching |
| 3 | `docker/build-push-action@v6` (API) | Build & push `.NET API` image |
| 4 | `docker/build-push-action@v6` (Client) | Build & push `Angular + Nginx` image |

**Image Tags:** `latest` + git SHA (e.g., `sha-a1b2c3d`)

**Caching:** GitHub Actions cache (`type=gha`) for Docker layer caching.

---

## 3. CD Pipeline (`cd.yml`)

**File:** [`.github/workflows/cd.yml`](file:///.github/workflows/cd.yml)

### Trigger

```yaml
on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]
    branches: [main]
```

Automatically triggers after a successful CI run on `main`.

### Job 1: Deploy to Staging

| Step | Action | Description |
| ---- | ------ | ----------- |
| 1 | `docker/login-action@v3` | Auth to GHCR |
| 2 | `appleboy/ssh-action@v1` | SSH into staging server |
| 3 | `docker compose pull` | Pull latest images |
| 4 | `docker compose up -d` | Start/update services |
| 5 | `docker system prune -f` | Clean old images |

### Job 2: Smoke Tests

Runs after staging deployment, validates critical endpoints:

| Test | Endpoint | Purpose |
| ---- | -------- | ------- |
| API Liveness | `GET /health` | Server is running |
| API Readiness | `GET /health/ready` | PostgreSQL connectivity |
| Client | `GET /` | Angular SPA is serving |

All requests use `--retry 5` with `--retry-delay 10` for resilience.

### Job 3: Deploy to Production

Uses a GitHub **Environment** with a manual approval gate.

> [!IMPORTANT]
> Production deployment requires **manual approval** through GitHub's environment protection rules. Configure this in **Settings → Environments → production → Required reviewers**.

---

## 4. Required Secrets & Variables

### Secrets (Settings → Secrets and Variables → Actions)

| Secret | Used In | Description |
| ------ | ------- | ----------- |
| `GITHUB_TOKEN` | CI + CD | Auto-provided, GHCR authentication |
| `STAGING_HOST` | CD | Staging server hostname/IP |
| `STAGING_USER` | CD | SSH username for staging |
| `STAGING_SSH_KEY` | CD | SSH private key for staging |
| `PRODUCTION_HOST` | CD | Production server hostname/IP |
| `PRODUCTION_USER` | CD | SSH username for production |
| `PRODUCTION_SSH_KEY` | CD | SSH private key for production |

### Variables (Settings → Secrets → Variables)

| Variable | Used In | Example |
| -------- | ------- | ------- |
| `STAGING_URL` | CD | `https://staging.example.com` |
| `STAGING_CLIENT_URL` | CD | `https://staging-app.example.com` |
| `PRODUCTION_URL` | CD | `https://api.example.com` |

---

## 5. Environments Setup

Configure two environments in **GitHub → Settings → Environments**:

### Staging

- **URL:** Your staging server URL
- **No protection rules** (auto-deploy)

### Production

- **URL:** Your production server URL
- **Required reviewers:** Add team members who can approve
- **Wait timer:** Optional cooldown (e.g., 5 minutes)
- **Deployment branches:** `main` only

---

## 6. Caching Strategy

| Layer | Mechanism | Key |
| ----- | --------- | --- |
| NuGet packages | `actions/cache@v4` | Hash of `*.csproj` files |
| npm packages | `actions/setup-node` built-in | `package-lock.json` hash |
| Docker layers | BuildKit `type=gha` | Automatic layer caching |

---

## 7. Running Locally

### Simulate CI checks before pushing:

```bash
# Backend: build and test
dotnet restore CloudStorage.sln
dotnet build CloudStorage.sln --configuration Release
dotnet test --configuration Release

# Frontend: test and build
cd CloudStorage.Client
npm ci
npm test -- --run
npm run build -- --configuration production

# Docker: build images locally
docker compose build
docker compose up -d
```

### Verify health endpoints:

```bash
# Liveness
curl http://localhost:5000/health

# Readiness (requires running PostgreSQL)
curl http://localhost:5000/health/ready
```

---

## 8. Extending the Pipeline

### Adding Code Coverage

```yaml
# Add to backend test steps:
- name: Run tests with coverage
  run: dotnet test --collect:"XPlat Code Coverage" --results-directory ./coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    directory: ./coverage
    token: ${{ secrets.CODECOV_TOKEN }}
```

### Adding Security Scanning

```yaml
# Add as a new job:
security-scan:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: fs
        format: table
        exit-code: 1
        severity: CRITICAL,HIGH
```

### Adding Database Migrations Check

```yaml
# Add to backend job:
- name: Verify EF migrations
  run: |
    dotnet tool install --global dotnet-ef
    dotnet ef migrations script --project CloudStorage.Infrastructure \
      --startup-project CloudStorage.API --idempotent --output migration.sql
```

---

## 9. Troubleshooting

| Issue | Cause | Fix |
| ----- | ----- | --- |
| PostgreSQL connection refused | Service not healthy | Check service health options in CI config |
| Docker push 403 | Missing permissions | Ensure `packages: write` in job permissions |
| npm ci fails | Lock file mismatch | Run `npm install` locally, commit `package-lock.json` |
| Staging SSH timeout | Firewall / wrong key | Verify SSH key and security groups |
| Tests pass locally, fail in CI | Environment differences | Check OS-specific paths, use `/` not `\` |
