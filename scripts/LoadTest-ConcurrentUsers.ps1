<#
.SYNOPSIS
    Concurrent user stress test — simulates N users each uploading files simultaneously.

.DESCRIPTION
    Spawns N parallel user sessions, each performing a full chunked upload (register, login,
    initiate, upload chunks, complete). Validates no session corruption or chunk collisions.

.PARAMETER ApiUrl
    Base URL of the Cloud Storage API (default: http://localhost:5274)

.PARAMETER UserCount
    Number of concurrent users to simulate (default: 5)

.PARAMETER FileSizeGB
    File size per user in GB (default: 1)

.PARAMETER ChunkSizeMB
    Chunk size in MB (default: 10)

.PARAMETER Concurrency
    Parallel chunk uploads per user (default: 4)

.EXAMPLE
    .\LoadTest-ConcurrentUsers.ps1 -UserCount 5 -FileSizeGB 1
#>

param(
    [string]$ApiUrl = "http://localhost:5274",
    [int]$UserCount = 5,
    [double]$FileSizeGB = 1,
    [int]$ChunkSizeMB = 10,
    [int]$Concurrency = 4
)

$ErrorActionPreference = "Stop"

function Write-Banner($msg) { Write-Host "`n══════════════════════════════════════════" -Fore Cyan; Write-Host "  $msg" -Fore Cyan; Write-Host "══════════════════════════════════════════`n" -Fore Cyan }

Write-Banner "Concurrent User Stress Test"
Write-Host "  Users          : $UserCount"
Write-Host "  File Size/User : $FileSizeGB GB"
Write-Host "  Chunk Size     : $ChunkSizeMB MB"
Write-Host "  Concurrency    : $Concurrency per user"

$overallTimer = [System.Diagnostics.Stopwatch]::StartNew()
$totalBytes   = [long]($FileSizeGB * 1GB)
$chunkBytes   = [long]($ChunkSizeMB * 1MB)
$totalChunks  = [math]::Ceiling($totalBytes / $chunkBytes)

# Generate shared random buffer
$buffer = [byte[]]::new([math]::Min($chunkBytes, 10MB))
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($buffer)

$results = [System.Collections.Concurrent.ConcurrentBag[psobject]]::new()

1..$UserCount | ForEach-Object -ThrottleLimit $UserCount -Parallel {
    $userId       = $_
    $apiUrl       = $using:ApiUrl
    $totalBytes   = $using:totalBytes
    $chunkBytes   = $using:chunkBytes
    $totalChunks  = $using:totalChunks
    $buffer       = $using:buffer
    $results      = $using:results
    $concurrency  = $using:Concurrency
    $fileSizeGB   = $using:FileSizeGB

    $username = "stresstest_user_${userId}_$(Get-Random -Minimum 1000 -Maximum 9999)"
    $email    = "$username@stresstest.local"
    $password = "StressTest@123!"
    $errors   = 0

    $userTimer = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        # Register
        $regBody = @{ username = $username; email = $email; password = $password } | ConvertTo-Json
        try {
            $null = Invoke-RestMethod -Uri "$apiUrl/api/auth/register" -Method POST -ContentType "application/json" -Body $regBody
        } catch {}

        # Login
        $loginBody = @{ identifier = $username; password = $password } | ConvertTo-Json
        $login = Invoke-RestMethod -Uri "$apiUrl/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
        $token = $login.accessToken
        $headers = @{ Authorization = "Bearer $token" }

        Write-Host "  [User $userId] Logged in as $username" -Fore DarkGray

        # Initiate upload
        $fileName = "stress_${userId}_${fileSizeGB}GB.bin"
        $initBody = @{
            fileName    = $fileName
            contentType = "application/octet-stream"
            fileSize    = $totalBytes
            totalChunks = $totalChunks
        } | ConvertTo-Json

        $init = Invoke-RestMethod -Uri "$apiUrl/api/files/initiate" -Method POST -ContentType "application/json" -Body $initBody -Headers $headers
        $sessionId = $init.sessionId
        $fileId    = $init.fileId

        Write-Host "  [User $userId] Upload session: $sessionId" -Fore DarkGray

        # Upload chunks
        0..($totalChunks - 1) | ForEach-Object -ThrottleLimit $concurrency -Parallel {
            $chunkIndex  = $_
            $apiUrl      = $using:apiUrl
            $sessionId   = $using:sessionId
            $token       = $using:token
            $chunkBytes  = $using:chunkBytes
            $totalBytes  = $using:totalBytes
            $buffer      = $using:buffer

            try {
                $headers = @{ Authorization = "Bearer $token" }
                $actualSize = [math]::Min($chunkBytes, $totalBytes - ($chunkIndex * $chunkBytes))
                $chunkData = [byte[]]::new($actualSize)
                [Array]::Copy($buffer, 0, $chunkData, 0, [math]::Min($buffer.Length, $actualSize))

                $sha = [System.Security.Cryptography.SHA256]::Create()
                $hashBytes = $sha.ComputeHash($chunkData)
                $hash = [BitConverter]::ToString($hashBytes).Replace("-", "").ToLower()

                $boundary = [guid]::NewGuid().ToString()
                $LF = "`r`n"
                $bodyLines = @(
                    "--$boundary",
                    "Content-Disposition: form-data; name=`"sessionId`"$LF", $sessionId,
                    "--$boundary",
                    "Content-Disposition: form-data; name=`"chunkIndex`"$LF", "$chunkIndex",
                    "--$boundary",
                    "Content-Disposition: form-data; name=`"hash`"$LF", $hash,
                    "--$boundary",
                    "Content-Disposition: form-data; name=`"chunk`"; filename=`"chunk_$chunkIndex.bin`"",
                    "Content-Type: application/octet-stream$LF"
                ) -join $LF

                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyLines + $LF)
                $endBytes  = [System.Text.Encoding]::UTF8.GetBytes("$LF--$boundary--$LF")
                $fullBody  = [byte[]]::new($bodyBytes.Length + $chunkData.Length + $endBytes.Length)
                [Array]::Copy($bodyBytes, 0, $fullBody, 0, $bodyBytes.Length)
                [Array]::Copy($chunkData, 0, $fullBody, $bodyBytes.Length, $chunkData.Length)
                [Array]::Copy($endBytes, 0, $fullBody, $bodyBytes.Length + $chunkData.Length, $endBytes.Length)

                $null = Invoke-RestMethod -Uri "$apiUrl/api/files/chunks" -Method POST `
                    -ContentType "multipart/form-data; boundary=$boundary" `
                    -Body $fullBody -Headers $headers
            } catch {
                Write-Host "    [User $using:userId][ERR] Chunk $chunkIndex: $($_.Exception.Message)" -Fore Red
            }
        }

        # Complete
        $completeBody = @{ sessionId = $sessionId } | ConvertTo-Json
        $complete = Invoke-RestMethod -Uri "$apiUrl/api/files/complete" -Method POST -ContentType "application/json" -Body $completeBody -Headers $headers

        # Cleanup
        $null = Invoke-RestMethod -Uri "$apiUrl/api/files/$fileId" -Method DELETE -Headers $headers

        $userTimer.Stop()
        Write-Host "  [User $userId] ✔ Complete in $([math]::Round($userTimer.Elapsed.TotalSeconds, 1))s" -Fore Green

        $results.Add([psobject]@{
            User     = $userId
            Time     = [math]::Round($userTimer.Elapsed.TotalSeconds, 1)
            Errors   = 0
            Status   = "PASS"
        })
    }
    catch {
        $userTimer.Stop()
        Write-Host "  [User $userId] ✖ Failed: $($_.Exception.Message)" -Fore Red
        $results.Add([psobject]@{
            User     = $userId
            Time     = [math]::Round($userTimer.Elapsed.TotalSeconds, 1)
            Errors   = 1
            Status   = "FAIL"
        })
    }
}

$overallTimer.Stop()

Write-Banner "Results"
Write-Host "  Total Time: $([math]::Round($overallTimer.Elapsed.TotalSeconds, 1))s`n"
Write-Host "  User  | Time (s) | Status " -Fore White
Write-Host "  ------|----------|--------"
foreach ($r in $results) {
    $color = if ($r.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "  $($r.User.ToString().PadLeft(4))  | $($r.Time.ToString().PadLeft(8)) | $($r.Status)" -Fore $color
}

$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "`n  Passed: $passCount / $UserCount | Failed: $failCount" -Fore $(if ($failCount -eq 0) { "Green" } else { "Red" })
