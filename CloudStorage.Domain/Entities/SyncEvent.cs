using System;

namespace CloudStorage.Domain.Entities
{
    public enum SyncEventType
    {
        Created = 0,
        Modified = 1,
        Deleted = 2,
        Renamed = 3
    }

    public class SyncEvent
    {
        public Guid Id { get; set; }
        public Guid FileMetadataId { get; set; }
        public FileMetadata FileMetadata { get; set; } = null!;
        public Guid DeviceId { get; set; }
        public Device Device { get; set; } = null!;
        public SyncEventType EventType { get; set; }
        public DateTime Timestamp { get; set; }
        public string? VersionVector { get; set; }
    }
}
