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

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FilesController : ControllerBase
    {
        private readonly IFileService _fileService;
        private readonly IChunkStorageService _chunkStorage;
        private readonly INotificationService _notificationService;

        public FilesController(
            IFileService fileService, 
            IChunkStorageService chunkStorage,
            INotificationService notificationService)
        {
            _fileService = fileService;
            _chunkStorage = chunkStorage;
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
                return Ok(files);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            try
            {
                var userId = GetUserId();
                var stats = await _fileService.GetDashboardStatsAsync(userId);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
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
                    return NotFound(new { message = "File not found or access denied" });

                return Ok(file);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
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
                return CreatedAtAction(nameof(GetFileById), new { id = file.Id }, file);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
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

                return Ok(new { message = "File deleted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
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

                return Ok(new { message = "All files deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/permissions")]
        public async Task<IActionResult> GrantPermission(Guid id, FilePermissionDto dto)
        {
            try
            {
                var userId = GetUserId();
                
                PermissionType permissionType;
                if (!Enum.TryParse<PermissionType>(dto.PermissionType, true, out permissionType))
                {
                    return BadRequest(new { message = "Invalid permission type" });
                }

                await _fileService.GrantPermissionAsync(id, dto.UserId, userId, permissionType);
                return Ok(new { message = "Permission granted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
