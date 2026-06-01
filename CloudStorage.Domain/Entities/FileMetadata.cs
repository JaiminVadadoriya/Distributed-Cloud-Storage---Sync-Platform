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

    /// <summary>
    /// Represents metadata for a stored file.
    /// Inherits Id and CreatedAt from BaseAuditableEntity.
    /// Implements IOwnedEntity for polymorphic ownership checks.
    /// </summary>
    public class FileMetadata : BaseAuditableEntity<Guid>, IOwnedEntity
    {
        public FileMetadata()
        {
            Chunks = new List<FileChunk>();
            Permissions = new List<FilePermission>();
            SyncEvents = new List<SyncEvent>();
        }

        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long Size { get; set; }
        public int Version { get; set; } = 1;
        public Guid? ParentVersionId { get; set; }
        public int ChunkCount { get; set; }
        public string Hash { get; set; } = string.Empty;
        public DateTime LastModifiedAt { get; set; }
        public DateTime? LastSyncedAt { get; set; }
        public int OwnerId { get; set; }
        public User Owner { get; set; } = null!;
        public bool IsDeleted { get; set; }
        public string StoragePath { get; set; } = string.Empty;
        public Guid? FolderId { get; set; }
        public Folder? Folder { get; set; }

        // Version vector for conflict detection (JSON-serialized Dictionary<string, int>)
        public string? VersionVector { get; set; }

        // Upload session tracking
        public string UploadSessionId { get; set; } = string.Empty;
        public UploadStatus Status { get; set; } = UploadStatus.Pending;
        public int UploadedChunks { get; set; }

        // Navigation properties
        public virtual ICollection<FileChunk> Chunks { get; set; }
        public virtual ICollection<FilePermission> Permissions { get; set; }
        public virtual ICollection<SyncEvent> SyncEvents { get; set; }
    }
}
