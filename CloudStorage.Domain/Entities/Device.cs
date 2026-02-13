using System;

namespace CloudStorage.Domain.Entities
{
    public class Device
    {
        public Guid Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = string.Empty;
        public DateTime? LastSyncAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
