using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Infrastructure.Providers;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages chunked file uploads — session initiation, chunk upload,
    /// SAS URL generation, chunk verification, and upload completion.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/files")]
    [EnableRateLimiting("upload")]
    public class ChunkUploadController : BaseApiController
    {
        private readonly IFileMetadataRepository _fileRepository;
        private readonly IRepository<FileChunk> _chunkRepository;
        private readonly IChunkStorageProvider _chunkStorage;
        private readonly IDeduplicationService _deduplication;
        private readonly IStorageProviderFactory _providerFactory;
        private readonly IChunkVerificationService _verificationService;
        private readonly INotificationService _notificationService;
        private readonly IMessageQueue _messageQueue;
        private readonly IUploadOrchestrator _uploadOrchestrator;

        public ChunkUploadController(
            IFileMetadataRepository fileRepository,
            IRepository<FileChunk> chunkRepository,
            IChunkStorageProvider chunkStorage,
            IDeduplicationService deduplication,
            IStorageProviderFactory providerFactory,
            IChunkVerificationService verificationService,
            INotificationService notificationService,
            IMessageQueue messageQueue,
            IUploadOrchestrator uploadOrchestrator)
        {
            _fileRepository = fileRepository;
            _chunkRepository = chunkRepository;
            _chunkStorage = chunkStorage;
            _deduplication = deduplication;
            _providerFactory = providerFactory;
            _verificationService = verificationService;
            _notificationService = notificationService;
            _messageQueue = messageQueue;
            _uploadOrchestrator = uploadOrchestrator;
        }

        public class UploadChunkRequestDto
        {
            public required IFormFile Chunk { get; set; }
            public required string SessionId { get; set; }
            public int ChunkIndex { get; set; }
            public required string Hash { get; set; }
        }

        [HttpPost("initiate")]
        public Task<IActionResult> InitiateUpload([FromBody] InitiateUploadDto dto) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var sessionId = Guid.NewGuid().ToString();

            Console.WriteLine($"[TX_INIT] User: {userId} | Session: {sessionId} | File: {dto.FileName}");

            var fileMetadata = new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = dto.FileName,
                ContentType = dto.ContentType,
                Size = dto.FileSize,
                ChunkCount = dto.TotalChunks,
                Hash = dto.Hash,
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

            return Ok(ApiResponse<UploadSessionResponseDto>.Ok(response, "Upload session initiated"));
        });

        [HttpPost("chunks")]
        [RequestSizeLimit(115_343_360)] // 110 MB limit (chunk size + overhead)
        public Task<IActionResult> UploadChunk([FromForm] UploadChunkRequestDto request) => ExecuteAsync(async () =>
        {
            if (request.Chunk == null || request.Chunk.Length == 0)
                return BadRequest(ApiResponse.Fail("Chunk data is required"));

            var userId = GetUserId();

            var fileMetadata = await _fileRepository.GetBySessionIdAsync(request.SessionId);
            if (fileMetadata == null)
                return NotFound(ApiResponse.Fail("Upload session not found"));

            if (fileMetadata.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Unauthorized access to upload session"));

            var isDuplicate = await _deduplication.IsChunkDuplicateAsync(request.Hash);
            string storagePath;

            // Verify integrity before persistence
            using (var checkStream = request.Chunk.OpenReadStream())
            {
                using var sha256 = SHA256.Create();
                var computedHashBytes = await sha256.ComputeHashAsync(checkStream);
                var computedHash = BitConverter.ToString(computedHashBytes).Replace("-", "").ToLowerInvariant();

                if (!string.Equals(computedHash, request.Hash, StringComparison.OrdinalIgnoreCase))
                {
                    Console.WriteLine($"[TX_ERR] Integrity Mismatch | Session: {request.SessionId} | Index: {request.ChunkIndex} | Client: {request.Hash} | Server: {computedHash}");
                    return BadRequest(ApiResponse.Fail("CHUNK_CORRUPTION_DETECTED: Computed hash does not match provided hash."));
                }
            }

            if (isDuplicate)
            {
                using var stream = request.Chunk.OpenReadStream();
                storagePath = await _chunkStorage.SaveChunkAsync(fileMetadata.Id, request.ChunkIndex, stream);
            }
            else
            {
                using var stream = request.Chunk.OpenReadStream();
                storagePath = await _chunkStorage.SaveChunkAsync(fileMetadata.Id, request.ChunkIndex, stream);
                await _deduplication.RegisterChunkAsync(request.Hash, storagePath, request.Chunk.Length);
            }

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

            await _chunkRepository.AddAsync(fileChunk);

            var response = new ChunkUploadResponseDto
            {
                ChunkId = fileChunk.Id,
                Status = "uploaded",
                IsDuplicate = isDuplicate,
                Message = isDuplicate ? "Chunk deduplicated" : "Chunk uploaded successfully"
            };

            return Ok(ApiResponse<ChunkUploadResponseDto>.Ok(response, response.Message));
        });

        [HttpPost("complete")]
        public Task<IActionResult> CompleteUpload([FromBody] CompleteUploadDto dto) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();

            var fileMetadata = await _fileRepository.GetBySessionIdAsync(dto.SessionId);
            if (fileMetadata == null)
                return NotFound(ApiResponse.Fail("Upload session not found"));

            if (fileMetadata.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Unauthorized access to upload session"));

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

            fileMetadata.Status = UploadStatus.Complete;
            fileMetadata.LastModifiedAt = DateTime.UtcNow;
            await _fileRepository.UpdateAsync(fileMetadata);

            return Ok(ApiResponse<object>.Ok(new
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
            }, "Upload completed"));
        });

        [HttpGet("session/{sessionId}/status")]
        public Task<IActionResult> GetUploadStatus(string sessionId) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();

            var fileMetadata = await _fileRepository.GetBySessionIdAsync(sessionId);
            if (fileMetadata == null)
                return NotFound(ApiResponse.Fail("Upload session not found"));

            if (fileMetadata.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Unauthorized access to upload session"));

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

            return Ok(ApiResponse<UploadStatusResponseDto>.Ok(response, "Status retrieved"));
        });

        [HttpPost("sas-url")]
        [Obsolete("Use presigned-url instead")]
        public Task<IActionResult> GenerateSasUrl([FromBody] SasUploadUrlRequestDto dto) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var fileMetadata = await _fileRepository.GetBySessionIdAsync(dto.SessionId);

            if (fileMetadata == null)
                return NotFound(ApiResponse.Fail("Upload session not found"));

            if (fileMetadata.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Unauthorized access to upload session"));

            var isDuplicate = await _deduplication.IsChunkDuplicateAsync(dto.Hash);
            if (isDuplicate)
            {
                return Ok(ApiResponse<object>.Ok(new { isDuplicate = true }, "Chunk deduplicated"));
            }

            var presignedResult = await _chunkStorage.GenerateChunkUploadUrlAsync(fileMetadata.Id, dto.ChunkIndex, TimeSpan.FromMinutes(15));
            var sasResponse = new SasUploadUrlResponseDto
            {
                SasUrl = presignedResult.Url,
                BlobName = presignedResult.ObjectKey,
                ExpiresAt = presignedResult.ExpiresAt
            };
            return Ok(ApiResponse<SasUploadUrlResponseDto>.Ok(sasResponse, "SAS URL generated"));
        });

        [HttpPost("presigned-url")]
        public Task<IActionResult> GeneratePresignedUrl([FromBody] PresignedUploadUrlRequestDto dto) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var fileMetadata = await _fileRepository.GetBySessionIdAsync(dto.SessionId);

            if (fileMetadata == null)
                return NotFound(ApiResponse.Fail("Upload session not found"));

            if (fileMetadata.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Unauthorized access to upload session"));

            var isDuplicate = await _deduplication.IsChunkDuplicateAsync(dto.Hash);
            if (isDuplicate)
            {
                return Ok(ApiResponse<object>.Ok(new { isDuplicate = true }, "Chunk deduplicated"));
            }

            var presignedResult = await _chunkStorage.GenerateChunkUploadUrlAsync(fileMetadata.Id, dto.ChunkIndex, TimeSpan.FromMinutes(15));
            var response = new PresignedUploadUrlResponseDto
            {
                Url = presignedResult.Url,
                ObjectKey = presignedResult.ObjectKey,
                ExpiresAt = presignedResult.ExpiresAt
            };
            return Ok(ApiResponse<PresignedUploadUrlResponseDto>.Ok(response, "Presigned URL generated"));
        });

        [HttpPost("verify-chunk")]
        public Task<IActionResult> VerifyChunk([FromBody] VerifyChunkUploadDto dto) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var fileMetadata = await _fileRepository.GetBySessionIdAsync(dto.SessionId);

            if (fileMetadata == null)
                return NotFound(ApiResponse.Fail("Upload session not found"));

            if (fileMetadata.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Unauthorized access to upload session"));

            var exists = await _chunkStorage.ChunkExistsAsync(dto.BlobName);
            if (!exists)
                return BadRequest(ApiResponse.Fail("Chunk blob not found in storage"));

            var activeProvider = _providerFactory.GetProvider().ProviderName;
            var storagePath = StoragePathResolver.FormatPath(activeProvider, dto.BlobName);

            var fileChunk = new FileChunk
            {
                Id = Guid.NewGuid(),
                FileMetadataId = fileMetadata.Id,
                ChunkIndex = dto.ChunkIndex,
                Size = dto.Size,
                Hash = dto.Hash,
                StoragePath = storagePath,
                BlobUrl = dto.BlobName,
                IsDuplicate = false,
                CreatedAt = DateTime.UtcNow,
                UploadedAt = DateTime.UtcNow
            };

            await _chunkRepository.AddAsync(fileChunk);
            await _deduplication.RegisterChunkAsync(dto.Hash, fileChunk.StoragePath, dto.Size);

            return Ok(ApiResponse.Ok("Chunk verified and registered successfully"));
        });

        [HttpPost("orchestrated-upload")]
        [DisableRequestSizeLimit]
        public Task<IActionResult> OrchestratedUpload([FromForm] IFormFile file, [FromForm] string sessionId) => ExecuteAsync(async () =>
        {
            var userId = GetUserId();
            var fileMetadata = await _fileRepository.GetBySessionIdAsync(sessionId);

            if (fileMetadata == null)
                return NotFound(ApiResponse.Fail("Upload session not found"));

            if (fileMetadata.OwnerId != userId)
                return StatusCode(403, ApiResponse.Fail("Unauthorized access to upload session"));

            using var stream = file.OpenReadStream();
            
            var result = await _uploadOrchestrator.OrchestrateUploadAsync(
                fileMetadata.Id,
                fileMetadata.FileName,
                stream,
                file.Length,
                new StorageUploadOptions { ContentType = file.ContentType, Overwrite = true },
                null
            );

            fileMetadata.Status = UploadStatus.Complete;
            fileMetadata.StoragePath = result.StoragePath;
            await _fileRepository.UpdateAsync(fileMetadata);

            return Ok(ApiResponse.Ok("File uploaded and orchestrated successfully"));
        });
    }
}
