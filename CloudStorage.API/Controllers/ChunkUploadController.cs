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
using Microsoft.AspNetCore.RateLimiting;

namespace CloudStorage.API.Controllers
{
    [ApiController]
    [Route("api/files")]
    [Authorize]
    [EnableRateLimiting("upload")]
    public class ChunkUploadController : ControllerBase
    {
        private readonly IFileMetadataRepository _fileRepository;
        private readonly IRepository<FileChunk> _chunkRepository;
        private readonly IChunkStorageService _chunkStorage;
        private readonly IDeduplicationService _deduplication;
        private readonly IBlobSasService _sasService;
        private readonly IAzureChunkVerificationService _verificationService;
        private readonly INotificationService _notificationService;
        private readonly IMessageQueue _messageQueue;

        public ChunkUploadController(
            IFileMetadataRepository fileRepository,
            IRepository<FileChunk> chunkRepository,
            IChunkStorageService chunkStorage,
            IDeduplicationService deduplication,
            IBlobSasService sasService,
            IAzureChunkVerificationService verificationService,
            INotificationService notificationService,
            IMessageQueue messageQueue)
        {
            _fileRepository = fileRepository;
            _chunkRepository = chunkRepository;
            _chunkStorage = chunkStorage;
            _deduplication = deduplication;
            _sasService = sasService;
            _verificationService = verificationService;
            _notificationService = notificationService;
            _messageQueue = messageQueue;
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

                return Ok(new ApiResponse<UploadSessionResponseDto>
                {
                    Success = true,
                    Message = "Upload session initiated",
                    Data = response
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

        public class UploadChunkRequestDto
        {
            public IFormFile Chunk { get; set; }
            public string SessionId { get; set; }
            public int ChunkIndex { get; set; }
            public string Hash { get; set; }
        }

        [HttpPost("chunks")]
        [RequestSizeLimit(115_343_360)] // 110 MB limit (chunk size + overhead)
        public async Task<IActionResult> UploadChunk([FromForm] UploadChunkRequestDto request)
        {
            try
            {
                if (request.Chunk == null || request.Chunk.Length == 0)
                    return BadRequest(new ApiResponse
                    {
                        Success = false,
                        Message = "Chunk data is required"
                    });

                var userId = GetUserId();

                // Find file by session ID
                var fileMetadata = await _fileRepository.GetBySessionIdAsync(request.SessionId);
                if (fileMetadata == null)
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = "Upload session not found"
                    });

                if (fileMetadata.OwnerId != userId)
                    return Forbid("Unauthorized access to upload session");

                // Check for deduplication (avoid re-hashing/re-transmitting from network)
                var isDuplicate = await _deduplication.IsChunkDuplicateAsync(request.Hash);
                string storagePath;

                if (isDuplicate)
                {
                    // Even for duplicates, save the chunk under THIS file's own directory.
                    // Reusing another file's StoragePath would cause cascading failures if
                    // that original file is ever deleted. The dedup benefit is that the
                    // client skips re-uploading identical bytes (server confirms via hash).
                    using var stream = request.Chunk.OpenReadStream();
                    storagePath = await _chunkStorage.SaveChunkAsync(fileMetadata.Id, request.ChunkIndex, stream);
                }
                else
                {
                    // Save new chunk and register in dedup registry
                    using var stream = request.Chunk.OpenReadStream();
                    storagePath = await _chunkStorage.SaveChunkAsync(fileMetadata.Id, request.ChunkIndex, stream);
                    await _deduplication.RegisterChunkAsync(request.Hash, storagePath, request.Chunk.Length);
                }

                // Create chunk record
                var fileChunk = new FileChunk
                {
                    Id = Guid.NewGuid(),
                    FileMetadataId = fileMetadata.Id,
                    ChunkIndex = request.ChunkIndex,
                    Size = request.Chunk.Length,
                    Hash = request.Hash,
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

                return Ok(new ApiResponse<ChunkUploadResponseDto>
                {
                    Success = true,
                    Message = response.Message,
                    Data = response
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

        [HttpPost("complete")]
        public async Task<IActionResult> CompleteUpload([FromBody] CompleteUploadDto dto)
        {
            try
            {
                var userId = GetUserId();

                var fileMetadata = await _fileRepository.GetBySessionIdAsync(dto.SessionId);
                if (fileMetadata == null)
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = "Upload session not found"
                    });

                if (fileMetadata.OwnerId != userId)
                    return Forbid("Unauthorized access to upload session");

                // Offload verification to RabbitMQ instead of doing it synchronously
                var dedupTask = new
                {
                    TaskType = "VerifyAndComplete",
                    FileId = fileMetadata.Id,
                    ChunkCount = fileMetadata.ChunkCount,
                    SessionId = dto.SessionId,
                    OwnerId = fileMetadata.OwnerId,
                    FileName = fileMetadata.FileName,
                    Size = fileMetadata.Size
                };
                
                await _messageQueue.PublishAsync("deduplication-tasks", dedupTask);

                // Update status to processing (or complete if we trust the background worker)
                fileMetadata.Status = UploadStatus.Complete; // Assuming frontend expects Complete to proceed, or Processing.
                fileMetadata.LastModifiedAt = DateTime.UtcNow;
                await _fileRepository.UpdateAsync(fileMetadata);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Upload completed",
                    Data = new
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

        [HttpGet("session/{sessionId}/status")]
        public async Task<IActionResult> GetUploadStatus(string sessionId)
        {
            try
            {
                var userId = GetUserId();

                var fileMetadata = await _fileRepository.GetBySessionIdAsync(sessionId);
                if (fileMetadata == null)
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = "Upload session not found"
                    });

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

                return Ok(new ApiResponse<UploadStatusResponseDto>
                {
                    Success = true,
                    Message = "Status retrieved",
                    Data = response
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

        [HttpPost("sas-url")]
        public async Task<IActionResult> GenerateSasUrl([FromBody] SasUploadUrlRequestDto dto)
        {
            try
            {
                var userId = GetUserId();
                var fileMetadata = await _fileRepository.GetBySessionIdAsync(dto.SessionId);
                
                if (fileMetadata == null)
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = "Upload session not found"
                    });

                if (fileMetadata.OwnerId != userId)
                    return Forbid("Unauthorized access to upload session");

                var isDuplicate = await _deduplication.IsChunkDuplicateAsync(dto.Hash);
                if (isDuplicate)
                {
                    // For duplicates, client doesn't need to upload to Azure
                    return Ok(new ApiResponse<object>
                    {
                        Success = true,
                        Message = "Chunk deduplicated",
                        Data = new { isDuplicate = true }
                    });
                }

                var sasResponse = await _sasService.GenerateChunkUploadSasAsync(fileMetadata.Id, dto.ChunkIndex);
                
                return Ok(new ApiResponse<SasUploadUrlResponseDto>
                {
                    Success = true,
                    Message = "SAS URL generated",
                    Data = sasResponse
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

        [HttpPost("verify-chunk")]
        public async Task<IActionResult> VerifyChunk([FromBody] VerifyChunkUploadDto dto)
        {
            try
            {
                var userId = GetUserId();
                var fileMetadata = await _fileRepository.GetBySessionIdAsync(dto.SessionId);
                
                if (fileMetadata == null)
                    return NotFound(new ApiResponse
                    {
                        Success = false,
                        Message = "Upload session not found"
                    });

                if (fileMetadata.OwnerId != userId)
                    return Forbid("Unauthorized access to upload session");

                // Verify the blob actually exists in Azure
                var exists = await _sasService.ChunkBlobExistsAsync(dto.BlobName);
                if (!exists)
                {
                    return BadRequest(new ApiResponse
                    {
                        Success = false,
                        Message = "Chunk blob not found in storage"
                    });
                }

                // Create chunk record
                var fileChunk = new FileChunk
                {
                    Id = Guid.NewGuid(),
                    FileMetadataId = fileMetadata.Id,
                    ChunkIndex = dto.ChunkIndex,
                    Size = dto.Size,
                    Hash = dto.Hash,
                    StoragePath = $"azure://{dto.BlobName}", 
                    BlobUrl = dto.BlobName,
                    IsDuplicate = false,
                    CreatedAt = DateTime.UtcNow,
                    UploadedAt = DateTime.UtcNow
                };

                await _chunkRepository.AddAsync(fileChunk);
                await _deduplication.RegisterChunkAsync(dto.Hash, fileChunk.StoragePath, dto.Size);

                return Ok(new ApiResponse
                {
                    Success = true,
                    Message = "Chunk verified and registered successfully"
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
    }
}
