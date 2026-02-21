using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/files")]
    [Authorize]
    public class ChunkUploadController : ControllerBase
    {
        private readonly IFileMetadataRepository _fileRepository;
        private readonly IRepository<FileChunk> _chunkRepository;
        private readonly IChunkStorageService _chunkStorage;
        private readonly IDeduplicationService _deduplication;

        public ChunkUploadController(
            IFileMetadataRepository fileRepository,
            IRepository<FileChunk> chunkRepository,
            IChunkStorageService chunkStorage,
            IDeduplicationService deduplication)
        {
            _fileRepository = fileRepository;
            _chunkRepository = chunkRepository;
            _chunkStorage = chunkStorage;
            _deduplication = deduplication;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                throw new UnauthorizedAccessException("User ID not found in token");

            return int.Parse(userIdClaim);
        }

        [HttpPost("initiate")]
        public async Task<IActionResult> InitiateUpload([FromBody] InitiateUploadDto dto)
        {
            try
            {
                var userId = GetUserId();
                var sessionId = Guid.NewGuid().ToString();

                var fileMetadata = new FileMetadata
                {
                    Id = Guid.NewGuid(),
                    FileName = dto.FileName,
                    ContentType = dto.ContentType,
                    Size = dto.FileSize,
                    ChunkCount = dto.TotalChunks,
                    OwnerId = userId,
                    UploadSessionId = sessionId,
                    Status = UploadStatus.InProgress,
                    UploadedChunks = 0,
                    CreatedAt = DateTime.UtcNow,
                    LastModifiedAt = DateTime.UtcNow
                };

                await _fileRepository.AddAsync(fileMetadata);

                var response = new UploadSessionResponseDto
                {
                    FileId = fileMetadata.Id,
                    SessionId = sessionId,
                    UploadUrl = $"/api/files/chunks"
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("chunks")]
        public async Task<IActionResult> UploadChunk(
            [FromForm] IFormFile chunk,
            [FromForm] string sessionId,
            [FromForm] int chunkIndex,
            [FromForm] string hash)
        {
            try
            {
                if (chunk == null || chunk.Length == 0)
                    return BadRequest(new { message = "Chunk data is required" });

                var userId = GetUserId();

                // Find file by session ID
                var fileMetadata = await _fileRepository.GetBySessionIdAsync(sessionId);
                if (fileMetadata == null)
                    return NotFound(new { message = "Upload session not found" });

                if (fileMetadata.OwnerId != userId)
                    return Forbid("Unauthorized access to upload session");

                // Check for deduplication (avoid re-hashing/re-transmitting from network)
                var isDuplicate = await _deduplication.IsChunkDuplicateAsync(hash);
                string storagePath;

                if (isDuplicate)
                {
                    // Even for duplicates, save the chunk under THIS file's own directory.
                    // Reusing another file's StoragePath would cause cascading failures if
                    // that original file is ever deleted. The dedup benefit is that the
                    // client skips re-uploading identical bytes (server confirms via hash).
                    using var stream = chunk.OpenReadStream();
                    storagePath = await _chunkStorage.SaveChunkAsync(fileMetadata.Id, chunkIndex, stream);
                }
                else
                {
                    // Save new chunk and register in dedup registry
                    using var stream = chunk.OpenReadStream();
                    storagePath = await _chunkStorage.SaveChunkAsync(fileMetadata.Id, chunkIndex, stream);
                    await _deduplication.RegisterChunkAsync(hash, storagePath, chunk.Length);
                }

                // Create chunk record
                var fileChunk = new FileChunk
                {
                    Id = Guid.NewGuid(),
                    FileMetadataId = fileMetadata.Id,
                    ChunkIndex = chunkIndex,
                    Size = chunk.Length,
                    Hash = hash,
                    StoragePath = storagePath,
                    IsDuplicate = isDuplicate,
                    CreatedAt = DateTime.UtcNow,
                    UploadedAt = DateTime.UtcNow
                };

                // Insert chunk into the repository explicitly
                // NOT updating fileMetadata here to avoid Optimistic Concurrency exceptions.
                await _chunkRepository.AddAsync(fileChunk);

                var response = new ChunkUploadResponseDto
                {
                    ChunkId = fileChunk.Id,
                    Status = "uploaded",
                    IsDuplicate = isDuplicate,
                    Message = isDuplicate ? "Chunk deduplicated" : "Chunk uploaded successfully"
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("complete")]
        public async Task<IActionResult> CompleteUpload([FromBody] CompleteUploadDto dto)
        {
            try
            {
                var userId = GetUserId();

                var fileMetadata = await _fileRepository.GetBySessionIdAsync(dto.SessionId);
                if (fileMetadata == null)
                    return NotFound(new { message = "Upload session not found" });

                if (fileMetadata.OwnerId != userId)
                    return Forbid("Unauthorized access to upload session");

                // Validate all chunks uploaded
                if (fileMetadata.Chunks.Count != fileMetadata.ChunkCount)
                {
                    return BadRequest(new
                    {
                        message = $"Incomplete upload: {fileMetadata.Chunks.Count}/{fileMetadata.ChunkCount} chunks uploaded"
                    });
                }

                // Update status to complete
                fileMetadata.Status = UploadStatus.Complete;
                fileMetadata.LastModifiedAt = DateTime.UtcNow;
                await _fileRepository.UpdateAsync(fileMetadata);

                return Ok(new
                {
                    fileId = fileMetadata.Id,
                    status = "complete",
                    metadata = new
                    {
                        fileMetadata.FileName,
                        fileMetadata.Size,
                        fileMetadata.ChunkCount,
                        fileMetadata.ContentType
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("session/{sessionId}/status")]
        public async Task<IActionResult> GetUploadStatus(string sessionId)
        {
            try
            {
                var userId = GetUserId();

                var fileMetadata = await _fileRepository.GetBySessionIdAsync(sessionId);
                if (fileMetadata == null)
                    return NotFound(new { message = "Upload session not found" });

                if (fileMetadata.OwnerId != userId)
                    return Forbid("Unauthorized access to upload session");

                // Get uploaded chunk indices
                var uploadedChunks = fileMetadata.Chunks
                    .OrderBy(c => c.ChunkIndex)
                    .Select(c => c.ChunkIndex)
                    .ToArray();

                var response = new UploadStatusResponseDto
                {
                    SessionId = sessionId,
                    UploadedChunks = uploadedChunks,
                    TotalChunks = fileMetadata.ChunkCount,
                    Status = fileMetadata.Status.ToString()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
