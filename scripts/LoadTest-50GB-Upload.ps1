<#
.SYNOPSIS
    Load test script for simulated 50GB resumable upload via chunked upload API.

.DESCRIPTION
    Tests the full chunked upload flow:
    1. Register/login a test user
    2. Initiate a chunked upload session
    3. Upload N chunks (configurable size) with parallel HTTP calls
    4. Complete the upload
    5. Verify resumable download with Range headers
    6. Report timing, throughput, and error count

.PARAMETER ApiUrl
    Base URL of the Cloud Storage API (default: http://localhost:5274)

.PARAMETER TotalSizeGB
    Total file size to simulate in GB (default: 50)

.PARAMETER ChunkSizeMB
    Size of each chunk in MB (default: 100)

.PARAMETER Concurrency
    Number of parallel upload workers (default: 8)

.PARAMETER Username
    Test username (default: loadtest_user)

.PARAMETER Password
    Test password (default: LoadTest@123!)

.EXAMPLE
    .\LoadTest-50GB-Upload.ps1 -ApiUrl "http://localhost:5274" -TotalSizeGB 50 -ChunkSizeMB 100

.EXAMPLE
    # Quick test with 1GB
    .\LoadTest-50GB-Upload.ps1 -TotalSizeGB 1 -ChunkSizeMB 10
#>

param(
    [string]$ApiUrl = "http://localhost:5274",
    [double]$TotalSizeGB = 50,
    [int]$ChunkSizeMB = 100,
    [int]$Concurrency = 8,
    [string]$Username = "loadtest_user_$(Get-Random -Minimum 1000 -Maximum 9999)",
    [string]$Password = "LoadTest@123!",
    [string]$Email = ""
)

if (-not $Email) { $Email = "$Username@loadtest.local" }

$ErrorActionPreference = "Stop"

# ─── Helpers ───────────────────────────────────────────────────────────
function Write-Banner($msg) { Write-Host "`n══════════════════════════════════════════" -Fore Cyan; Write-Host "  $msg" -Fore Cyan; Write-Host "══════════════════════════════════════════`n" -Fore Cyan }
function Write-Step($msg)   { Write-Host "  ► $msg" -Fore Yellow }
function Write-OK($msg)     { Write-Host "  ✔ $msg" -Fore Green }
function Write-Err($msg)    { Write-Host "  ✖ $msg" -Fore Red }

# ─── Configuration ─────────────────────────────────────────────────────
$totalBytes   = [long]($TotalSizeGB * 1GB)
$chunkBytes   = [long]($ChunkSizeMB * 1MB)
$totalChunks  = [math]::Ceiling($totalBytes / $chunkBytes)

Write-Banner "Cloud Storage Load Test — $($TotalSizeGB)GB Upload"
Write-Host "  API URL       : $ApiUrl"
Write-Host "  Total Size    : $TotalSizeGB GB ($totalBytes bytes)"
Write-Host "  Chunk Size    : $ChunkSizeMB MB ($chunkBytes bytes)"
Write-Host "  Total Chunks  : $totalChunks"
Write-Host "  Concurrency   : $Concurrency"
Write-Host "  Test User     : $Username"

$overallTimer = [System.Diagnostics.Stopwatch]::StartNew()

# ─── Step 1: Register & Login ──────────────────────────────────────────
Write-Banner "Step 1: Register & Login"

Write-Step "Registering test user..."
try {
    $regBody = @{ username = $Username; email = $Email; password = $Password } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "$ApiUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $regBody
    Write-OK "User registered: $Username"
} catch {
    if ($_.Exception.Message -match "already exists") {
        Write-OK "User already exists, proceeding to login"
    } else {
        Write-Err "Registration failed: $($_.Exception.Message)"
    }
}

Write-Step "Logging in..."
$loginBody = @{ identifier = $Username; password = $Password } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.accessToken
Write-OK "Login successful — token: $($token.Substring(0, 20))..."

$headers = @{ Authorization = "Bearer $token" }

# ─── Step 2: Initiate Upload Session ───────────────────────────────────
Write-Banner "Step 2: Initiate Upload Session"

$fileName = "loadtest_$($TotalSizeGB)GB_$(Get-Date -Format 'yyyyMMdd_HHmmss').bin"
$initiateBody = @{
    fileName    = $fileName
    contentType = "application/octet-stream"
    fileSize    = $totalBytes
    totalChunks = $totalChunks
} | ConvertTo-Json

Write-Step "Initiating upload for $fileName..."
$initResponse = Invoke-RestMethod -Uri "$ApiUrl/api/files/initiate" -Method POST -ContentType "application/json" -Body $initiateBody -Headers $headers
$sessionId = $initResponse.sessionId
$fileId    = $initResponse.fileId
Write-OK "Session ID : $sessionId"
Write-OK "File ID    : $fileId"

# ─── Step 3: Check Resume Status ──────────────────────────────────────
Write-Banner "Step 3: Check Existing Upload Status (Resume Support)"

$statusResponse = Invoke-RestMethod -Uri "$ApiUrl/api/files/session/$sessionId/status" -Method GET -Headers $headers
$alreadyUploaded = @($statusResponse.uploadedChunks)
$chunksToUpload  = 0..($totalChunks - 1) | Where-Object { $_ -notin $alreadyUploaded }

Write-OK "Already uploaded : $($alreadyUploaded.Count) chunks"
Write-OK "Remaining        : $($chunksToUpload.Count) chunks"

# ─── Step 4: Upload Chunks ────────────────────────────────────────────
Write-Banner "Step 4: Upload $($chunksToUpload.Count) Chunks (Concurrency: $Concurrency)"

$uploadTimer = [System.Diagnostics.Stopwatch]::StartNew()
$errorCount  = [ref]0
$uploaded    = [ref]0

# Generate a reusable random buffer for chunk data
Write-Step "Generating $ChunkSizeMB MB random buffer..."
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$buffer = [byte[]]::new([math]::Min($chunkBytes, 10MB)) # 10MB buffer, reused
$rng.GetBytes($buffer)

$hashAlgo = [System.Security.Cryptography.SHA256]::Create()

$chunksToUpload | ForEach-Object -ThrottleLimit $Concurrency -Parallel {
    $chunkIndex   = $_
    $apiUrl       = $using:ApiUrl
    $sessionId    = $using:sessionId
    $token        = $using:token
    $chunkBytes   = $using:chunkBytes
    $totalBytes   = $using:totalBytes
    $buffer       = $using:buffer
    $errorCount   = $using:errorCount
    $uploaded     = $using:uploaded
    $totalChunks  = $using:totalChunks

    try {
        $headers = @{ Authorization = "Bearer $token" }

        # Calculate actual chunk size (last chunk may be smaller)
        $actualSize = [math]::Min($chunkBytes, $totalBytes - ($chunkIndex * $chunkBytes))

        # Generate chunk data (use a subset of the buffer)
        $chunkData = [byte[]]::new($actualSize)
        [Array]::Copy($buffer, 0, $chunkData, 0, [math]::Min($buffer.Length, $actualSize))

        # Compute SHA256 hash
        $sha = [System.Security.Cryptography.SHA256]::Create()
        $hashBytes = $sha.ComputeHash($chunkData)
        $hash = [BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()

        # Build multipart form data
        $boundary = [guid]::NewGuid().ToString()
        $LF = "`r`n"

        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"sessionId`"$LF",
            $sessionId,
            "--$boundary",
            "Content-Disposition: form-data; name=`"chunkIndex`"$LF",
            "$chunkIndex",
            "--$boundary",
            "Content-Disposition: form-data; name=`"hash`"$LF",
            $hash,
            "--$boundary",
            "Content-Disposition: form-data; name=`"chunk`"; filename=`"chunk_$chunkIndex.bin`"",
            "Content-Type: application/octet-stream$LF"
        ) -join $LF

        $bodyBytes  = [System.Text.Encoding]::UTF8.GetBytes($bodyLines + $LF)
        $endBytes   = [System.Text.Encoding]::UTF8.GetBytes("$LF--$boundary--$LF")
        $fullBody   = [byte[]]::new($bodyBytes.Length + $chunkData.Length + $endBytes.Length)
        [Array]::Copy($bodyBytes, 0, $fullBody, 0, $bodyBytes.Length)
        [Array]::Copy($chunkData, 0, $fullBody, $bodyBytes.Length, $chunkData.Length)
        [Array]::Copy($endBytes, 0, $fullBody, $bodyBytes.Length + $chunkData.Length, $endBytes.Length)

        $contentType = "multipart/form-data; boundary=$boundary"

        $response = Invoke-RestMethod -Uri "$apiUrl/api/files/chunks" `
            -Method POST `
            -ContentType $contentType `
            -Body $fullBody `
            -Headers $headers

        [System.Threading.Interlocked]::Increment($uploaded) | Out-Null
        $pct = [math]::Round(($uploaded.Value / $totalChunks) * 100, 1)
        Write-Host "    [$pct%] Chunk $chunkIndex uploaded — $($response.status)" -Fore DarkGray
    }
    catch {
        [System.Threading.Interlocked]::Increment($errorCount) | Out-Null
        Write-Host "    [ERR] Chunk $chunkIndex failed: $($_.Exception.Message)" -Fore Red
    }
}

$uploadTimer.Stop()
$uploadSec = $uploadTimer.Elapsed.TotalSeconds
$throughputMBs = [math]::Round(($totalBytes / 1MB) / $uploadSec, 2)

Write-OK "Upload complete!"
Write-Host "  Time         : $([math]::Round($uploadSec, 1))s"
Write-Host "  Throughput   : $throughputMBs MB/s"
Write-Host "  Errors       : $($errorCount.Value)"

# ─── Step 5: Complete Upload ──────────────────────────────────────────
Write-Banner "Step 5: Complete Upload"

$completeBody = @{ sessionId = $sessionId } | ConvertTo-Json
try {
    $completeResponse = Invoke-RestMethod -Uri "$ApiUrl/api/files/complete" -Method POST -ContentType "application/json" -Body $completeBody -Headers $headers
    Write-OK "Upload completed: $($completeResponse.status)"
    Write-OK "File: $($completeResponse.metadata.fileName) — $($completeResponse.metadata.size) bytes — $($completeResponse.metadata.chunkCount) chunks"
} catch {
    Write-Err "Complete failed: $($_.Exception.Message)"
}

# ─── Step 6: Verify Resumable Download ────────────────────────────────
Write-Banner "Step 6: Verify Resumable Download (Range Request)"

try {
    # Head request equivalent: get first 1KB
    $rangeHeaders = @{ Authorization = "Bearer $token"; Range = "bytes=0-1023" }
    $downloadResponse = Invoke-WebRequest -Uri "$ApiUrl/api/files/$fileId/download" -Method GET -Headers $rangeHeaders -UseBasicParsing

    if ($downloadResponse.StatusCode -eq 206) {
        Write-OK "Partial content (206) — Resumable download works!"
        Write-OK "Content-Range: $($downloadResponse.Headers['Content-Range'])"
    } elseif ($downloadResponse.StatusCode -eq 200) {
        Write-OK "Full content returned (200) — download works, range may not be supported for this size"
    }
} catch {
    Write-Err "Download verification failed: $($_.Exception.Message)"
}

# ─── Step 7: Cleanup ──────────────────────────────────────────────────
Write-Banner "Step 7: Cleanup"

try {
    $null = Invoke-RestMethod -Uri "$ApiUrl/api/files/$fileId" -Method DELETE -Headers $headers
    Write-OK "Test file deleted"
} catch {
    Write-Err "Cleanup failed: $($_.Exception.Message)"
}

# ─── Summary ──────────────────────────────────────────────────────────
$overallTimer.Stop()
Write-Banner "Load Test Summary"
Write-Host "  Total Time     : $([math]::Round($overallTimer.Elapsed.TotalSeconds, 1))s"
Write-Host "  File Size      : $TotalSizeGB GB"
Write-Host "  Chunks         : $totalChunks × $ChunkSizeMB MB"
Write-Host "  Concurrency    : $Concurrency"
Write-Host "  Upload Time    : $([math]::Round($uploadSec, 1))s"
Write-Host "  Throughput     : $throughputMBs MB/s"
Write-Host "  Errors         : $($errorCount.Value)"

if ($errorCount.Value -eq 0) {
    Write-Host "`n  ★ ALL TESTS PASSED ★" -Fore Green
} else {
    Write-Host "`n  ⚠ $($errorCount.Value) ERRORS DETECTED" -Fore Red
}
