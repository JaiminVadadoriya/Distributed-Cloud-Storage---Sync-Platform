using System;

namespace CloudStorage.Domain.Entities
{
    public class DbObjectMetadata
    {
        public Guid ObjectId { get; set; }
        public string Key { get; set; } = string.Empty;
        public long Size { get; set; }
        public string RootHash { get; set; } = string.Empty;
        public string ChunkHashesJson { get; set; } = "[]";
        public string TenantId { get; set; } = string.Empty;
        public string CurrentTier { get; set; } = "Hot";
        public string TagsJson { get; set; } = "{}";
        public DateTime LastModified { get; set; } = DateTime.UtcNow;
    }
}
