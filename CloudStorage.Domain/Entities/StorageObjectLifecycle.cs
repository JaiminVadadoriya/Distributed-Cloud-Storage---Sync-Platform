using System;
using CloudStorage.Domain.Enums;

namespace CloudStorage.Domain.Entities
{
    public class StorageObjectLifecycle : BaseAuditableEntity<Guid>
    {
        public Guid FileId { get; set; }
        public string ObjectKey { get; set; } = string.Empty;
        public string ProviderName { get; set; } = string.Empty;
        public StorageTier CurrentTier { get; set; } = StorageTier.Hot;
        public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;
    }
}
