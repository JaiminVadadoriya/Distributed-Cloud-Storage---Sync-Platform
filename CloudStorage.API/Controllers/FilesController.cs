using System;
using System.IO;
using System.Linq;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Infrastructure.Providers;
using CloudStorage.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages file CRUD, downloads, sharing, versioning, and bulk operations.
    /// Inherits from BaseApiController for shared GetUserId() and ExecuteAsync().
    /// </summary>
    [Route("api/[controller]")]
    [EnableRateLimiting("global")]
    public class FilesController : BaseApiController
    {
        private readonly IFileService _fileService;
        private readonly IChunkStorageProvider _chunkStorage;
        private readonly IStorageProviderFactory _providerFactory;
        private readonly INotificationService _notificationService;

        public FilesController(
            IFileService fileService,
            IChunkStorageProvider chunkStorage,
            IStorageProviderFactory providerFactory,
            INotificationService notificationService)
        {
            _fileService = fileService;
            _chunkStorage = chunkStorage;
            _providerFactory = providerFactory;
            _notificationService = notificationService;
        }

        [HttpGet]
        public Task<IActionResult> GetUserFiles() => ExecuteAsync(async () =>
        {
            var files = await _fileService.GetUserFilesAsync(GetUserId());
            return Ok(ApiResponse<IEnumerable<FileListDto>>.Ok(files, "Files retrieved successfully"));
        });

        [HttpGet("stats")]
        public Task<IActionResult> GetDashboardStats() => ExecuteAsync(async () =>
        {
            var stats = await _fileService.GetDashboardStatsAsync(GetUserId());
            return Ok(ApiResponse<DashboardStatsDto>.Ok(stats, "Stats retrieved successfully"));
        });

        [HttpGet("storage-breakdown")]
        public Task<IActionResult> GetStorageBreakdown() => ExecuteAsync(async () =>
        {
            GetUserId(); // Validate auth
            return Ok(ApiResponse<object>.Ok(null!, "Storage breakdown retrieved successfully"));
        });

        [HttpGet("shared")]
        public Task<IActionResult> GetSharedFiles() => ExecuteAsync(async () =>
        {
            var files = await _fileService.GetSharedFilesAsync(GetUserId());
            return Ok(ApiResponse<IEnumerable<FileListDto>>.Ok(files, "Shared files retrieved successfully"));
        });

        [HttpGet("search")]
        public Task<IActionResult> SearchFiles([FromQuery] string q) => ExecuteAsync(async () =>
        {
            var files = await _fileService.SearchFilesAsync(GetUserId(), q);
            return Ok(ApiResponse<IEnumerable<FileListDto>>.Ok(files, "Search results retrieved successfully"));
        });

        [HttpGet("{id:guid}")]
        public Task<IActionResult> GetFileById(Guid id) => ExecuteAsync(async () =>
        {
            var file = await _fileService.GetFileByIdAsync(id, GetUserId());
            if (file == null)
                return NotFound(ApiResponse.Fail("File not found or access denied"));

            return Ok(ApiResponse<FileResponseDto>.Ok(file, "File retrieved successfully"));
        });

        [HttpGet("{id:guid}/download")]
        public async Task DownloadFile(Guid id, CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            var file = await _fileService.GetFileByIdAsync(id, userId);

            if (file == null)
            {
                Response.StatusCode = 404;
                return;
            }

            IEnumerable<(string StoragePath, long Size)> chunks;
            try
            {
                chunks = await _fileService.GetFileChunkPathsAsync(id, userId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] GetFileChunkPaths Failed | FileId: {id} | Error: {ex}");
                Response.StatusCode = 500;
                return;
            }

            // Disable response buffering so we can stream terabyte/petabyte files
            HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

            long totalLength = file.Size;
            Response.Headers.Append("Accept-Ranges", "bytes");
            Response.Headers.Append("X-Accel-Buffering", "no");
            Response.Headers.Append("Cache-Control", "public, max-age=86400");

            Response.ContentType = file.ContentType;
            Response.Headers.Append(
                "Content-Disposition",
                $"attachment; filename=\"{Uri.EscapeDataString(file.FileName)}\"");

            // --- HTTP Range request support (resumable downloads) ---
            long rangeStart = 0;
            long rangeEnd = totalLength - 1;
            bool isRangeRequest = false;

            var rangeHeader = Request.Headers["Range"].FirstOrDefault();
            if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
            {
                var rangePart = rangeHeader.Substring(6);
                var dashIndex = rangePart.IndexOf('-');
                if (dashIndex >= 0)
                {
                    var startStr = rangePart.Substring(0, dashIndex);
                    var endStr = rangePart.Substring(dashIndex + 1);

                    if (!string.IsNullOrEmpty(startStr) && long.TryParse(startStr, out var parsedStart))
                        rangeStart = parsedStart;

                    if (!string.IsNullOrEmpty(endStr) && long.TryParse(endStr, out var parsedEnd))
                        rangeEnd = parsedEnd;
                    else
                        rangeEnd = totalLength - 1;

                    if (rangeStart >= 0 && rangeStart <= rangeEnd && rangeEnd < totalLength)
                        isRangeRequest = true;
                    else
                    {
                        Response.StatusCode = 416;
                        Response.Headers.Append("Content-Range", $"bytes */{totalLength}");
                        return;
                    }
                }
            }

            long serveLength = rangeEnd - rangeStart + 1;
            Response.ContentLength = serveLength;

            if (isRangeRequest)
            {
                Response.StatusCode = 206;
                Response.Headers.Append("Content-Range", $"bytes {rangeStart}-{rangeEnd}/{totalLength}");
            }

            try
            {
                long bytesWritten = 0;
                long bytesSkipped = 0;
                const int bufferSize = 1 << 17; // 128 KB

                foreach (var chunk in chunks)
                {
                    if (cancellationToken.IsCancellationRequested) break;

                    long chunkLen = chunk.Size;
                    long chunkAbsoluteStart = bytesSkipped;
                    long chunkAbsoluteEnd = bytesSkipped + chunkLen - 1;

                    if (chunkAbsoluteEnd < rangeStart)
                    {
                        bytesSkipped += chunkLen;
                        continue;
                    }

                    if (chunkAbsoluteStart > rangeEnd) break;

                    long offsetInChunk = Math.Max(0, rangeStart - chunkAbsoluteStart);
                    long bytesFromChunk = Math.Min(chunkLen - offsetInChunk,
                                                   serveLength - bytesWritten);

                    using var chunkStream = await _chunkStorage.GetChunkAsync(chunk.StoragePath);

                    if (offsetInChunk > 0)
                        chunkStream.Seek(offsetInChunk, SeekOrigin.Begin);

                    var remaining = bytesFromChunk;
                    var buffer = new byte[bufferSize];
                    while (remaining > 0 && !cancellationToken.IsCancellationRequested)
                    {
                        int toRead = (int)Math.Min(buffer.Length, remaining);
                        int read = await chunkStream.ReadAsync(buffer, 0, toRead, cancellationToken);
                        if (read == 0) break;
                        await Response.Body.WriteAsync(buffer, 0, read, cancellationToken);
                        remaining -= read;
                        bytesWritten += read;
                    }

                    bytesSkipped += chunkLen;
                }
            }
            catch (OperationCanceledException)
            {
                // Client disconnected — expected, not an error
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] File Download Failed | FileId: {id} | UserId: {userId} | Error: {ex}");
                if (!Response.HasStarted)
                    Response.StatusCode = 500;
            }
        }

        [HttpPost]
        public Task<IActionResult> CreateFile(FileUploadDto dto) => ExecuteAsync(async () =>
        {
            var file = await _fileService.CreateFileMetadataAsync(dto, GetUserId());
            return CreatedAtAction(nameof(GetFileById), new { id = file.Id },
                ApiResponse<FileResponseDto>.Ok(file, "File created successfully"));
        });

        [HttpDelete("{id:guid}")]
        public Task<IActionResult> DeleteFile(Guid id) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            await _fileService.DeleteFileAsync(id, userId);
            await _notificationService.NotifyFileDeletedAsync(id, userId);
            return Ok(ApiResponse.Ok("File deleted successfully"));
        });

        [HttpDelete("all")]
        public Task<IActionResult> DeleteAllFiles() => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            await _fileService.DeleteAllUserFilesAsync(userId);
            await _notificationService.NotifyAllFilesDeletedAsync(userId);
            return Ok(ApiResponse.Ok("All files deleted successfully"));
        });

        [HttpPost("purge")]
        public Task<IActionResult> PurgeDrive() => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            await _fileService.PurgeUserDriveAsync(userId);
            await _notificationService.NotifyAllFilesDeletedAsync(userId); // Use existing notification for refresh
            return Ok(ApiResponse.Ok("Drive purged successfully"));
        });

        [HttpPost("{id:guid}/permissions")]
        [HttpPost("{id:guid}/share")]
        public Task<IActionResult> GrantPermission(Guid id, FilePermissionDto dto) => ExecuteAsync(async () =>
        {
            if (!Enum.TryParse<PermissionType>(dto.PermissionType, true, out var permissionType))
                return BadRequest(ApiResponse.Fail("Invalid permission type"));

            await _fileService.GrantPermissionAsync(id, dto.UserId, GetUserId(), permissionType);
            return Ok(ApiResponse.Ok("Permission granted successfully"));
        });

        [HttpGet("{id:guid}/download-link")]
        public Task<IActionResult> GenerateDownloadLink(Guid id) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var file = await _fileService.GetFileByIdAsync(id, userId);

            if (file == null)
                return NotFound(ApiResponse.Fail("File not found or access denied"));

            var chunks = await _fileService.GetFileChunkPathsAsync(id, userId);
            var chunkDtos = new System.Collections.Generic.List<object>();
            int index = 0;

            foreach (var chunk in chunks)
            {
                var (providerName, cleanKey) = StoragePathResolver.Resolve(chunk.StoragePath);
                var provider = _providerFactory.GetProvider(providerName);
                
                var presignedResult = await provider.GeneratePresignedDownloadUrlAsync(cleanKey, file.FileName, TimeSpan.FromMinutes(15));
                chunkDtos.Add(new { index = index++, size = chunk.Size, sasUrl = presignedResult.Url });
            }

            return Ok(ApiResponse<object>.Ok(new
            {
                fileName = file.FileName,
                totalSize = file.Size,
                contentType = file.ContentType,
                chunks = chunkDtos,
                expiresIn = 3600
            }, "Parallel download metadata generated"));
        });

        // ─── Version History ──────────────────────────────────────────────

        [HttpGet("{id:guid}/versions")]
        public Task<IActionResult> GetFileVersions(Guid id) => ExecuteAsync(async () =>
        {
            var versions = await _fileService.GetFileVersionsAsync(id, GetUserId());
            return Ok(ApiResponse<IEnumerable<FileVersionDto>>.Ok(versions, "Version history retrieved successfully"));
        });

        [HttpPost("{id:guid}/restore/{versionId:guid}")]
        public Task<IActionResult> RestoreVersion(Guid id, Guid versionId) => ExecuteAsync(async () =>
        {
            var file = await _fileService.RestoreFileVersionAsync(id, versionId, GetUserId());
            return Ok(ApiResponse<FileResponseDto>.Ok(file, "File version restored successfully"));
        });

        // ─── File Operations ──────────────────────────────────────────────

        [HttpPatch("{id:guid}/rename")]
        public Task<IActionResult> RenameFile(Guid id, FileRenameDto dto) => ExecuteAsync(async () =>
        {
            await _fileService.RenameFileAsync(id, dto.NewName, GetUserId());
            return Ok(ApiResponse.Ok("File renamed successfully"));
        });

        [HttpPatch("{id:guid}/move")]
        public Task<IActionResult> MoveFile(Guid id, FileMoveDto dto) => ExecuteAsync(async () =>
        {
            await _fileService.MoveFileAsync(id, dto.TargetFolderId, GetUserId());
            return Ok(ApiResponse.Ok("File moved successfully"));
        });

        // ─── Bulk Operations ──────────────────────────────────────────────

        [HttpPost("bulk-delete")]
        public Task<IActionResult> BulkDelete(BulkDeleteDto dto) => ExecuteAsync(async () =>
        {
            await _fileService.BulkDeleteAsync(dto.FileIds, GetUserId());
            return Ok(ApiResponse.Ok($"{dto.FileIds.Count} files deleted successfully"));
        });

        [HttpPost("bulk-move")]
        public Task<IActionResult> BulkMove(BulkMoveDto dto) => ExecuteAsync(async () =>
        {
            await _fileService.BulkMoveAsync(dto.FileIds, dto.TargetFolderId, GetUserId());
            return Ok(ApiResponse.Ok($"{dto.FileIds.Count} files moved successfully"));
        });

        [HttpPost("bulk-share")]
        public Task<IActionResult> BulkShare(BulkShareDto dto) => ExecuteAsync(async () =>
        {
            if (!Enum.TryParse<PermissionType>(dto.PermissionType, true, out var permissionType))
                return BadRequest(ApiResponse.Fail("Invalid permission type"));

            await _fileService.BulkShareAsync(dto.FileIds, dto.UserId, GetUserId(), permissionType);
            return Ok(ApiResponse.Ok($"{dto.FileIds.Count} files shared successfully"));
        });

        // ─── Permission Management ───────────────────────────────────────

        [HttpGet("{id:guid}/permissions")]
        public Task<IActionResult> GetPermissions(Guid id) => ExecuteAsync(async () =>
        {
            var permissions = await _fileService.GetFilePermissionsAsync(id, GetUserId());
            return Ok(ApiResponse<IEnumerable<FilePermissionListDto>>.Ok(permissions, "Permissions retrieved successfully"));
        });

        [HttpDelete("{id:guid}/permissions/{targetUserId}")]
        public Task<IActionResult> RemovePermission(Guid id, int targetUserId) => ExecuteAsync(async () =>
        {
            await _fileService.RemovePermissionAsync(id, targetUserId, GetUserId());
            return Ok(ApiResponse.Ok("Permission removed successfully"));
        });

        [HttpPatch("{id:guid}/permissions/{targetUserId}")]
        public Task<IActionResult> UpdatePermission(Guid id, int targetUserId, FilePermissionDto dto) => ExecuteAsync(async () =>
        {
            if (!Enum.TryParse<PermissionType>(dto.PermissionType, true, out var permissionType))
                return BadRequest(ApiResponse.Fail("Invalid permission type"));

            await _fileService.UpdatePermissionAsync(id, targetUserId, permissionType, GetUserId());
            return Ok(ApiResponse.Ok("Permission updated successfully"));
        });
    }
}
