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

| Step | Action/Command | Purpose |
| ---- | -------------- | ------- |
| 1 | `actions/setup-dotnet` | Install .NET 10 SDK (Pinned to SHA) |
| 2 | `actions/cache` | Cache NuGet packages (`~/.nuget/packages`) |
| 3 | `dotnet restore` | Restore solution dependencies |
| 4 | `dotnet build` | Compile all projects |
| 5 | `dotnet test` Domain.Tests | Unit tests with coverage collection |
| 6 | `dotnet test` Application.Tests | Application service tests with coverage |
| 7 | `dotnet test` Infrastructure.Tests | Integration tests (uses PostgreSQL container) |
| 8 | `dotnet test` API.Tests | Controller/API integration tests |
| 9 | `irongut/CodeCoverageSummary` | Enforce minimum 80% test coverage gate |
| 10 | `anchore/sbom-action` | Generate CycloneDX/SPDX SBOM metadata |
| 11 | Upload SBOM & Test results | Upload build artifact deliverables |

### Job 2: Frontend Build & Test

Runs in parallel with the backend job.

| Step | Action/Command | Purpose |
| ---- | -------------- | ------- |
| 1 | `actions/setup-node` | Install Node.js 22 |
| 2 | `npm ci` | Clean install of dependencies |
| 3 | `npm run lint` | Execute ESLint/Angular static analysis |
| 4 | `npm audit` | Audit npm dependencies (audit-level=high) |
| 5 | `npm run test:ci` | Run Vitest with coverage collection |
| 6 | `npm run build` | Production Angular build |
| 7 | Upload `dist/` | Artifact for deployment |

### Job 3: Security & CodeQL Analysis

Runs static analysis and config scans:
- **CodeQL Scan**: Compiles and scans C# and JavaScript/TypeScript codebases.
- **Trivy Config Scan**: Uses `aquasecurity/trivy-action` to search for Dockerfile, Kubernetes, and Compose file misconfigurations.

### Job 4: Docker Build & Push

Only runs on `push` to `main` branch, after all preceding build and test jobs succeed.

| Step | Action | Purpose |
| ---- | ------ | ------- |
| 1 | `docker/login-action` | Authenticate to GitHub Container Registry |
| 2 | `docker/setup-buildx-action` | Enable multi-platform builds and caching |
| 3 | `docker/build-push-action` (API) | Build & push `.NET API` image |
| 4 | `docker/build-push-action` (Client) | Build & push `Angular + Nginx` image |

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
- **Container Registry:** Azure Container Registry (ACR) or Docker Hub
- **Database:** PostgreSQL (Azure Database for PostgreSQL)
- **Cache & SignalR:** Redis (Azure Cache for Redis)
- **Message Broker:** RabbitMQ
- **Observability:** Prometheus + Grafana
- **CDN:** Azure CDN or CloudFlare
- **Infrastructure:** Kubernetes (AKS/EKS/GKE) with Ingress-NGINX
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

## 8. Hardening and Audits in the Pipeline

### Code Coverage Gates
The backend testing workflows use `XPlat Code Coverage` to output Cobertura XML files. These files are aggregated and validated using the `irongut/CodeCoverageSummary` action. If total coverage (or branch coverage) falls below **80%**, the CI build will fail automatically.

### Trivy Configuration Scanning
Infrastructure-as-Code (IaC) security is enforced during the `security-scan` job. Trivy analyzes all Kubernetes manifests under `k8s/` and Docker Compose setups for security issues (such as privilege escalation, root context usage, or deprecated API endpoints).

### CycloneDX/SPDX SBOM Generation
A release bill-of-materials is compiled during the backend build phase using the `anchore/sbom-action` tool, producing an SPDX format JSON log (`sbom.spdx.json`) mapping all package references, transitives, and internal module linkages.

### Database Migrations Verification
To verify database schemas are properly up to date:
```yaml
- name: Verify EF migrations
  run: |
    dotnet tool install --global dotnet-ef
    dotnet ef migrations script --project CloudStorage.Infrastructure \
      --startup-project CloudStorage.API --idempotent --output migration.sql
```

### GitHub App Token Format Compatibility
Our CI/CD pipelines use the standard `secrets.GITHUB_TOKEN` to login to the GitHub Container Registry via `docker/login-action`. The Docker daemon and login actions accept these tokens as opaque credentials. Therefore, our workflows are fully compatible with GitHub's stateless JWT-based token format (~520 characters and dots, starting with `ghs_`).

---

## 9. Troubleshooting

| Issue | Cause | Fix |
| ----- | ----- | --- |
| PostgreSQL connection refused | Service not healthy | Check service health options in CI config |
| Docker push 403 | Missing permissions | Ensure `packages: write` in job permissions |
| npm ci fails | Lock file mismatch | Run `npm install` locally, commit `package-lock.json` |
| Staging SSH timeout | Firewall / wrong key | Verify SSH key and security groups |
| Tests pass locally, fail in CI | Environment differences | Check OS-specific paths, use `/` not `\` |
