using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Registry entry for deduplication — tracks unique chunk hashes.
    /// Uses Hash (string) as its natural key instead of a numeric/Guid key,
    /// so it does not inherit from BaseEntity.
    /// </summary>
    public class ChunkRegistry
    {
        public string Hash { get; set; } = string.Empty;
        public string StoragePath { get; set; } = string.Empty;
        public long Size { get; set; }
        public int ReferenceCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
