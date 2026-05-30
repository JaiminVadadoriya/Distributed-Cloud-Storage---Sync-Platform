# Security Hardening — Week 11

This document details the security measures implemented for the Cloud Storage API.

---

## 1. TLS / HSTS Enforcement

| Setting | Value |
|---------|-------|
| `UseHttpsRedirection()` | Enabled for all environments |
| `UseHsts()` | Enabled for **non-Development** environments |
| HSTS `max-age` | 365 days (ASP.NET Core default) |
| `includeSubDomains` | Yes (default) |

**Configuration**: See [`Program.cs`](../CloudStorage.API/Program.cs) — the HSTS middleware runs before all other pipeline stages in production.

---

## 2. Security Headers

Every response includes secure headers configured in the API (`Program.cs`) and the frontend NGINX routing (`nginx.conf`):

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `X-XSS-Protection` | `0` | Disabled (modern CSP supersedes) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:;` | Restricts resource loading, disabling `'unsafe-inline'` script execution to eliminate XSS vectors |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables device APIs |

---

## 3. Rate Limiting

Three fixed-window rate-limiting policies protect application endpoints:

| Policy | Limit | Window | Applied To |
|--------|-------|--------|------------|
| `global` | 100 requests | 60 seconds | `FilesController` |
| `auth` | 30 requests | 60 seconds | `AuthController` (brute-force protection) |
| `upload` | 200 requests | 60 seconds | `ChunkUploadController` |

Rate-limited responses return **HTTP 429** with JSON body: `{ "message": "Too many requests. Please try again later." }`

---

## 4. Request Size Limits

| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| `POST /api/files/chunks` | 110 MB | Max chunk size (100 MB) + overhead |

---

## 5. Azure Server-Side Encryption (SSE)

Azure Storage encrypts all data at rest with **Microsoft-managed keys (SSE-MK)** by default. Our implementation adds:

- **Post-upload verification**: After each chunk upload, `BlobChunkStorageService` checks `BlobProperties.IsServerEncrypted` and logs the result
- **Audit method**: `VerifyEncryptionStatusAsync(fileId, chunkIndex)` — callable for compliance audits
- **CMK readiness**: `appsettings.json` now includes `AzureBlob:EncryptionScope` for future Customer-Managed Key (CMK) support

---

## 6. API Permission Matrix

| Controller | Auth Required | Rate Limit | Notes |
|------------|:---:|:---:|-------|
| `AuthController` | No (login/register) | `auth` (30/min) | Logout requires `[Authorize]` |
| `ChunkUploadController` | ✅ `[Authorize]` | `upload` (200/min) | 110 MB body limit on chunk upload |
| `FilesController` | ✅ `[Authorize]` | `global` (100/min) | Owner-only access enforced |
| `DeltaSyncController` | ✅ `[Authorize]` | — | Owner-only access via `GetUserId()` |
| `ConflictController` | ✅ `[Authorize]` | — | Owner-only access via `GetUserId()` |
| `HealthController` | No | — | Intentionally public (health probes) |

### SAS Token Security

- Permissions tightened from `Create | Write` → **`Write` only**
- Default expiry reduced from 60 → **15 minutes**
- Each SAS token is scoped to a single blob (chunk)

---

## 7. JWT & Secrets Management

All secrets, including JWT signing keys, PostgreSQL passwords, and message queue credentials, have been completely migrated out of source code configurations.

- **Local Development**: Configuration keys are loaded via a local `.env` environment variables file (gitignored).
- **Kubernetes Deployments**: Credentials are dynamically mounted from base64-encoded `Secret` objects.

For procedures on updating active secrets and sanitizing repository histories of historical credentials, please see the [**Secret Rotation Guide**](SECRET_ROTATION.md).

---

## 8. Supply Chain Hardening

We enforce strict software supply chain security standards in our CI/CD workflows:
- **Action Pinning**: All GitHub Actions are pinned to explicit, immutable commit SHAs instead of mutable tags to prevent hijacking.
- **IaC Scanning**: Automated **Trivy** configuration audits scan Kubernetes YAML files and Dockerfiles for structural security issues.
- **SBOM Generation**: Automatic **CycloneDX/SPDX Software Bill of Materials (SBOM)** is compiled and uploaded as part of release workflows.

---

## 9. Load Testing

Two PowerShell scripts are available in [`scripts/`](../scripts/):

| Script | Purpose | Usage |
|--------|---------|-------|
| `LoadTest-50GB-Upload.ps1` | Single-user 50 GB upload with resume support | `.\scripts\LoadTest-50GB-Upload.ps1 -TotalSizeGB 50` |
| `LoadTest-ConcurrentUsers.ps1` | Multi-user stress test (N concurrent uploads) | `.\scripts\LoadTest-ConcurrentUsers.ps1 -UserCount 5 -FileSizeGB 1` |

Both scripts support configurable chunk size, concurrency, and produce timing/throughput reports.
