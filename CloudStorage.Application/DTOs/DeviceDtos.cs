using System;

namespace CloudStorage.Application.DTOs
{
    public class DeviceDto
    {
        public Guid Id { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = string.Empty;
        public DateTime? LastSyncAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class RegisterDeviceDto
    {
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = string.Empty; // e.g. "desktop", "mobile", "browser"
    }

    public class UpdateDeviceSyncDto
    {
        public Guid DeviceId { get; set; }
    }
}
