using System;

namespace CloudStorage.Domain.Entities
{
    /// <summary>
    /// Records an auditable user action in the system.
    /// Uses BaseEntity (not Auditable) because it has Timestamp instead of CreatedAt.
    /// </summary>
    public class ActivityLog : BaseEntity<Guid>
    {
        public int UserId { get; set; }
        public string Action { get; set; } = string.Empty; // e.g., "UPLOAD", "DELETE", "SHARE", "RENAME"
        public string EntityType { get; set; } = string.Empty; // e.g., "FILE", "FOLDER"
        public string EntityId { get; set; } = string.Empty; // Guid string
        public string Details { get; set; } = string.Empty; // e.g., "File 'report.pdf' uploaded"
        public string? IpAddress { get; set; }
        public DateTime Timestamp { get; set; }

        // Navigation property
        public User User { get; set; } = null!;
    }
}
