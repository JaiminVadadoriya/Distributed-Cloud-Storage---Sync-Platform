using System;
using System.Collections.Generic;

namespace CloudStorage.Domain.Entities
{
    public enum UploadStatus
    {
        Pending = 0,
        InProgress = 1,
        Complete = 2,
        Failed = 3,
        Cancelled = 4
    }

    public class FileMetadata
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long Size { get; set; }
        public int Version { get; set; } = 1;
        public Guid? ParentVersionId { get; set; }
        public int ChunkCount { get; set; }
        public string Hash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
        public DateTime? LastSyncedAt { get; set; }
        public int OwnerId { get; set; }
        public User Owner { get; set; } = null!;
        public bool IsDeleted { get; set; }
        public string StoragePath { get; set; } = string.Empty;

        // Version vector for conflict detection (JSON-serialized Dictionary<string, int>)
        public string? VersionVector { get; set; }

        // Upload session tracking
        public string UploadSessionId { get; set; } = string.Empty;
        public UploadStatus Status { get; set; } = UploadStatus.Pending;
        public int UploadedChunks { get; set; }

        // Navigation properties
        public ICollection<FileChunk> Chunks { get; set; } = new List<FileChunk>();
        public ICollection<FilePermission> Permissions { get; set; } = new List<FilePermission>();
        public ICollection<SyncEvent> SyncEvents { get; set; } = new List<SyncEvent>();
    }
}
