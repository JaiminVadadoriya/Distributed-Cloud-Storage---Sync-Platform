using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Represents a registered user device for sync.
    /// Inherits Id and CreatedAt from BaseAuditableEntity.
    /// </summary>
    public class Device : BaseAuditableEntity<Guid>
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = string.Empty;
        public DateTime? LastSyncAt { get; set; }
    }
}
