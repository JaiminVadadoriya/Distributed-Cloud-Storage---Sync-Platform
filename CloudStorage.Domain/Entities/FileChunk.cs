using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Represents a single chunk of an uploaded file.
    /// Inherits Id and CreatedAt from BaseAuditableEntity.
    /// </summary>
    public class FileChunk : BaseAuditableEntity<Guid>
    {
        public Guid FileMetadataId { get; set; }
        public FileMetadata FileMetadata { get; set; } = null!;
        public int ChunkIndex { get; set; }
        public long Size { get; set; }
        public string Hash { get; set; } = string.Empty;
        public string StoragePath { get; set; } = string.Empty;
        public string? BlobUrl { get; set; }

        // Deduplication support
        public bool IsDuplicate { get; set; }
        public string? DuplicateSourceId { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}
