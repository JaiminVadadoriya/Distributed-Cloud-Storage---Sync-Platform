using System;

namespace CloudStorage.Domain.Entities
{
    public class FileChunk
    {
        public Guid Id { get; set; }
        public Guid FileMetadataId { get; set; }
        public FileMetadata FileMetadata { get; set; } = null!;
        public int ChunkIndex { get; set; }
        public long Size { get; set; }
        public string Hash { get; set; } = string.Empty;
        public string StoragePath { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        
        // Deduplication support
        public bool IsDuplicate { get; set; }
        public string? DuplicateSourceId { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}
