using System;

namespace CloudStorage.Domain.Entities
{
    public class ChunkRegistry
    {
        public string Hash { get; set; } = string.Empty;
        public string StoragePath { get; set; } = string.Empty;
        public long Size { get; set; }
        public int ReferenceCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
