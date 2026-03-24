using System;

namespace CloudStorage.Domain.Entities
{
    public enum NotificationType
    {
        FileUploaded = 0,
        FileShared = 1,
        FileDeleted = 2,
        SyncComplete = 3,
        PermissionChanged = 4,
        FileRestored = 5
    }

    public class Notification
    {
        public Guid Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public NotificationType Type { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public Guid? RelatedEntityId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
