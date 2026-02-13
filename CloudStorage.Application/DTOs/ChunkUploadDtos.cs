using System;

namespace CloudStorage.Application.DTOs
{
    public class InitiateUploadDto
    {
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public int TotalChunks { get; set; }
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
}
