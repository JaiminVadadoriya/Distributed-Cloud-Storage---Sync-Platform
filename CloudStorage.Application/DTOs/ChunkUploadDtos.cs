using System;

namespace CloudStorage.Application.DTOs
{
    public class InitiateUploadDto
    {
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public int TotalChunks { get; set; }
        public string Hash { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
    }

    public class UploadSessionResponseDto
    {
        public Guid FileId { get; set; }
        public string SessionId { get; set; } = string.Empty;
        public string UploadUrl { get; set; } = string.Empty;
    }

    public class ChunkUploadResponseDto
    {
        public Guid ChunkId { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsDuplicate { get; set; }
        public string? Message { get; set; }
    }

    public class CompleteUploadDto
    {
        public string SessionId { get; set; } = string.Empty;
    }

    public class UploadStatusResponseDto
    {
        public string SessionId { get; set; } = string.Empty;
        public int[] UploadedChunks { get; set; } = Array.Empty<int>();
        public int TotalChunks { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class PresignedUploadUrlRequestDto
    {
        public string SessionId { get; set; } = string.Empty;
        public int ChunkIndex { get; set; }
        public string Hash { get; set; } = string.Empty;
    }

    [Obsolete("Use PresignedUploadUrlRequestDto")]
    public class SasUploadUrlRequestDto : PresignedUploadUrlRequestDto
    {
    }

    public class PresignedUploadUrlResponseDto
    {
        public string Url { get; set; } = string.Empty;
        public string ObjectKey { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    [Obsolete("Use PresignedUploadUrlResponseDto")]
    public class SasUploadUrlResponseDto
    {
        public string SasUrl { get; set; } = string.Empty;
        public string BlobName { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    public class VerifyChunkUploadDto
    {
        public string SessionId { get; set; } = string.Empty;
        public int ChunkIndex { get; set; }
        public string Hash { get; set; } = string.Empty;
        public string BlobName { get; set; } = string.Empty;
        public long Size { get; set; }
    }

    public class ChunkVerificationResultDto
    {
        public bool IsValid { get; set; }
        public int[] MissingChunkIndices { get; set; } = Array.Empty<int>();
    }

    [Obsolete("Use ChunkVerificationResultDto")]
    public class BlobChunkVerificationResultDto : ChunkVerificationResultDto
    {
    }
}
