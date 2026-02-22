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

Every response includes these headers via custom middleware:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `X-XSS-Protection` | `0` | Disabled (modern CSP supersedes) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Content-Security-Policy` | `default-src 'self'` | Restricts resource loading |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables device APIs |

---

## 3. Rate Limiting

Three tiered policies protect against abuse:

| Policy | Limit | Window | Applied To |
|--------|-------|--------|------------|
| `global` | 100 requests | 60 seconds | `FilesController` |
| `auth` | 10 requests | 60 seconds | `AuthController` (brute-force protection) |
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
| `AuthController` | No (login/register) | `auth` (10/min) | Logout requires `[Authorize]` |
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

## 7. JWT Key Management

> [!IMPORTANT]
> The JWT signing key in `appsettings.json` is for **development only**.

**Production best practice:**
```bash
# Use environment variables (docker-compose already does this)
Jwt__Key=<your-production-secret-minimum-32-characters>

# Or use Azure Key Vault / User Secrets
dotnet user-secrets set "Jwt:Key" "<production-key>"
```

---

## 8. Load Testing

Two PowerShell scripts are available in [`scripts/`](../scripts/):

| Script | Purpose | Usage |
|--------|---------|-------|
| `LoadTest-50GB-Upload.ps1` | Single-user 50 GB upload with resume support | `.\scripts\LoadTest-50GB-Upload.ps1 -TotalSizeGB 50` |
| `LoadTest-ConcurrentUsers.ps1` | Multi-user stress test (N concurrent uploads) | `.\scripts\LoadTest-ConcurrentUsers.ps1 -UserCount 5 -FileSizeGB 1` |

Both scripts support configurable chunk size, concurrency, and produce timing/throughput reports.
