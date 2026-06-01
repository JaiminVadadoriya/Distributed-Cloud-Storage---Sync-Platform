using System;

namespace CloudStorage.Application.DTOs
{
    public class ConflictCheckRequestDto
    {
        public Guid FileId { get; set; }
        public string ClientVersionVector { get; set; } = string.Empty;
        public DateTime ClientLastModifiedAt { get; set; }
    }

    public class ConflictCheckResponseDto
    {
        public bool HasConflict { get; set; }
        public string? ServerVersionVector { get; set; }
        public DateTime ServerLastModifiedAt { get; set; }
        public string ServerFileName { get; set; } = string.Empty;
        public long ServerSize { get; set; }
        public int ServerVersion { get; set; }
    }

    public enum ConflictResolution
    {
        KeepLocal = 0,
        KeepServer = 1,
        ConflictCopy = 2   // Creates a new "conflicted copy" file (for binary files)
    }

    public class ConflictResolutionDto
    {
        public Guid FileId { get; set; }
        public ConflictResolution Resolution { get; set; }
        public string? ClientVersionVector { get; set; }
    }
}
