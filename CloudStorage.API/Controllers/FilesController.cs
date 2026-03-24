using System;
using System.IO;
using System.Linq;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [EnableRateLimiting("global")]
    public class FilesController : ControllerBase
    {
        private readonly IFileService _fileService;
        private readonly IChunkStorageService _chunkStorage;
        private readonly IBlobSasService _sasService;
        private readonly INotificationService _notificationService;

        public FilesController(
            IFileService fileService, 
            IChunkStorageService chunkStorage,
            IBlobSasService sasService,
            INotificationService notificationService)
        {
            _fileService = fileService;
            _chunkStorage = chunkStorage;
            _sasService = sasService;
            _notificationService = notificationService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");

            return int.Parse(userIdClaim);
        }

        [HttpGet]
        public async Task<IActionResult> GetUserFiles()
        {
            try
            {
                var userId = GetUserId();
                var files = await _fileService.GetUserFilesAsync(userId);
                return Ok(new ApiResponse<IEnumerable<FileListDto>>
                {
                    Success = true,
                    Message = "Files retrieved successfully",
                    Data = files
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            try
            {
                var userId = GetUserId();
                var stats = await _fileService.GetDashboardStatsAsync(userId);
                return Ok(new ApiResponse<DashboardStatsDto>
                {
                    Success = true,
                    Message = "Stats retrieved successfully",
                    Data = stats
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("shared")]
        public async Task<IActionResult> GetSharedFiles()
        {
            try
            {
                var userId = GetUserId();
                var files = await _fileService.GetSharedFilesAsync(userId);
                return Ok(new ApiResponse<IEnumerable<FileListDto>>
                {
                    Success = true,
                    Message = "Shared files retrieved successfully",
                    Data = files
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchFiles([FromQuery] string q)
        {
            try
            {
                var userId = GetUserId();
                var files = await _fileService.SearchFilesAsync(userId, q);
                return Ok(new ApiResponse<IEnumerable<FileListDto>>
                {
                    Success = true,
                    Message = "Search results retrieved successfully",
                    Data = files
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetFileById(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var file = await _fileService.GetFileByIdAsync(id, userId);

                if (file == null)
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = "File not found or access denied"
                    });

                return Ok(new ApiResponse<FileResponseDto>
                {
                    Success = true,
                    Message = "File retrieved successfully",
                    Data = file
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("{id}/download")]
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
            
            // Add Cache-Control for CDN edge caching
            Response.Headers.Append("Cache-Control", "public, max-age=86400"); // 24 hours

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
                var rangePart = rangeHeader.Substring(6); // strip "bytes="
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
                        // Invalid range
                        Response.StatusCode = 416; // Range Not Satisfiable
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

            // Stream chunks, skipping bytes outside the requested range
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
                    long chunkAbsoluteEnd   = bytesSkipped + chunkLen - 1;

                    // Skip chunks entirely before the range start
                    if (chunkAbsoluteEnd < rangeStart)
                    {
                        bytesSkipped += chunkLen;
                        continue;
                    }

                    // Stop after we've written everything up to rangeEnd
                    if (chunkAbsoluteStart > rangeEnd) break;

                    // Determine slice of this chunk to write
                    long offsetInChunk  = Math.Max(0, rangeStart - chunkAbsoluteStart);
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
        public async Task<IActionResult> CreateFile(FileUploadDto dto)
        {
            try
            {
                var userId = GetUserId();
                var file = await _fileService.CreateFileMetadataAsync(dto, userId);
                var response = new ApiResponse<FileResponseDto>
                {
                    Success = true,
                    Message = "File created successfully",
                    Data = file
                };
                return CreatedAtAction(nameof(GetFileById), new { id = file.Id }, response);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFile(Guid id)
        {
            try
            {
                var userId = GetUserId();
                await _fileService.DeleteFileAsync(id, userId);

                // Push real-time notification
                await _notificationService.NotifyFileDeletedAsync(id, userId);

                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "File deleted successfully"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("all")]
        public async Task<IActionResult> DeleteAllFiles()
        {
            try
            {
                var userId = GetUserId();
                await _fileService.DeleteAllUserFilesAsync(userId);
                
                // Push real-time notification
                await _notificationService.NotifyAllFilesDeletedAsync(userId);

                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "All files deleted successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("{id}/permissions")]
        [HttpPost("{id}/share")] // Standardized alias for frontend compatibility
        public async Task<IActionResult> GrantPermission(Guid id, FilePermissionDto dto)
        {
            try
            {
                var userId = GetUserId();
                
                PermissionType permissionType;
                if (!Enum.TryParse<PermissionType>(dto.PermissionType, true, out permissionType))
                {
                    return BadRequest(new ApiResponse
                    {
                        Success = false,
                        Message = "Invalid permission type"
                    });
                }

                await _fileService.GrantPermissionAsync(id, dto.UserId, userId, permissionType);
                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "Permission granted successfully"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("{id}/download-link")]
        public async Task<IActionResult> GenerateDownloadLink(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var file = await _fileService.GetFileByIdAsync(id, userId);

                if (file == null)
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = "File not found or access denied"
                    });

                var chunks = await _fileService.GetFileChunkPathsAsync(id, userId);
                var chunkDtos = new System.Collections.Generic.List<object>();
                int index = 0;

                foreach (var chunk in chunks)
                {
                    // Extract blob name from storage path
                    string blobName;
                    if (chunk.StoragePath.StartsWith("azure://", StringComparison.OrdinalIgnoreCase))
                    {
                        blobName = chunk.StoragePath.Substring(8);
                    }
                    else if (Uri.IsWellFormedUriString(chunk.StoragePath, UriKind.Absolute))
                    {
                        var uri = new Uri(chunk.StoragePath);
                        // Fallback: extract the part of the path that looks like fileId/chunkIndex.chunk
                        // Chunks are stored as {fileId}/{index}.chunk
                        var segments = uri.Segments;
                        if (segments.Length >= 2)
                        {
                            blobName = segments[^2].TrimEnd('/') + "/" + segments[^1];
                        }
                        else
                        {
                            blobName = segments[^1];
                        }
                    }
                    else
                    {
                        blobName = chunk.StoragePath;
                    }

                    var sasUrl = await _sasService.GenerateDownloadSasUrlAsync(blobName, file.FileName);
                    chunkDtos.Add(new
                    {
                        index = index++,
                        size = chunk.Size,
                        sasUrl = sasUrl
                    });
                }
                
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Parallel download metadata generated",
                    Data = new 
                    { 
                        fileName = file.FileName,
                        totalSize = file.Size,
                        contentType = file.ContentType,
                        chunks = chunkDtos,
                        expiresIn = 3600 // 1 hour (align with SAS default)
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }
        // ─── Version History ──────────────────────────────────────────────

        [HttpGet("{id}/versions")]
        public async Task<IActionResult> GetFileVersions(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var versions = await _fileService.GetFileVersionsAsync(id, userId);
                return Ok(new ApiResponse<IEnumerable<FileVersionDto>>
                {
                    Success = true,
                    Message = "Version history retrieved successfully",
                    Data = versions
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("{id}/restore/{versionId}")]
        public async Task<IActionResult> RestoreVersion(Guid id, Guid versionId)
        {
            try
            {
                var userId = GetUserId();
                var file = await _fileService.RestoreFileVersionAsync(id, versionId, userId);
                return Ok(new ApiResponse<FileResponseDto>
                {
                    Success = true,
                    Message = "File version restored successfully",
                    Data = file
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        // ─── File Operations ──────────────────────────────────────────────

        [HttpPatch("{id}/rename")]
        public async Task<IActionResult> RenameFile(Guid id, FileRenameDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _fileService.RenameFileAsync(id, dto.NewName, userId);
                return Ok(new ApiResponse { Success = true, Message = "File renamed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        [HttpPatch("{id}/move")]
        public async Task<IActionResult> MoveFile(Guid id, FileMoveDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _fileService.MoveFileAsync(id, dto.TargetFolderId, userId);
                return Ok(new ApiResponse { Success = true, Message = "File moved successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        // ─── Bulk Operations ──────────────────────────────────────────────

        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDelete(BulkDeleteDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _fileService.BulkDeleteAsync(dto.FileIds, userId);
                return Ok(new ApiResponse { Success = true, Message = $"{dto.FileIds.Count} files deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("bulk-move")]
        public async Task<IActionResult> BulkMove(BulkMoveDto dto)
        {
            try
            {
                var userId = GetUserId();
                await _fileService.BulkMoveAsync(dto.FileIds, dto.TargetFolderId, userId);
                return Ok(new ApiResponse { Success = true, Message = $"{dto.FileIds.Count} files moved successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("bulk-share")]
        public async Task<IActionResult> BulkShare(BulkShareDto dto)
        {
            try
            {
                var userId = GetUserId();

                PermissionType permissionType;
                if (!Enum.TryParse<PermissionType>(dto.PermissionType, true, out permissionType))
                    return BadRequest(new ApiResponse { Success = false, Message = "Invalid permission type" });

                await _fileService.BulkShareAsync(dto.FileIds, dto.UserId, userId, permissionType);
                return Ok(new ApiResponse { Success = true, Message = $"{dto.FileIds.Count} files shared successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        // ─── Permission Management ───────────────────────────────────────

        [HttpGet("{id}/permissions")]
        public async Task<IActionResult> GetPermissions(Guid id)
        {
            try
            {
                var userId = GetUserId();
                var permissions = await _fileService.GetFilePermissionsAsync(id, userId);
                return Ok(new ApiResponse<IEnumerable<FilePermissionListDto>>
                {
                    Success = true,
                    Message = "Permissions retrieved successfully",
                    Data = permissions
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        [HttpDelete("{id}/permissions/{targetUserId}")]
        public async Task<IActionResult> RemovePermission(Guid id, int targetUserId)
        {
            try
            {
                var userId = GetUserId();
                await _fileService.RemovePermissionAsync(id, targetUserId, userId);
                return Ok(new ApiResponse { Success = true, Message = "Permission removed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }

        [HttpPatch("{id}/permissions/{targetUserId}")]
        public async Task<IActionResult> UpdatePermission(Guid id, int targetUserId, FilePermissionDto dto)
        {
            try
            {
                var userId = GetUserId();

                PermissionType permissionType;
                if (!Enum.TryParse<PermissionType>(dto.PermissionType, true, out permissionType))
                    return BadRequest(new ApiResponse { Success = false, Message = "Invalid permission type" });

                await _fileService.UpdatePermissionAsync(id, targetUserId, permissionType, userId);
                return Ok(new ApiResponse { Success = true, Message = "Permission updated successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new ApiResponse { Success = false, Message = ex.Message });
            }
        }
    }
}
