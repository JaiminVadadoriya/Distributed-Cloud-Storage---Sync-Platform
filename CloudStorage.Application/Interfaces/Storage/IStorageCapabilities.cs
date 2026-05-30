using System;

namespace CloudStorage.Application.Interfaces.Storage
{
    public interface IStorageCapabilities
    {
        bool SupportsMultipartUpload { get; }
        bool SupportsVersioning { get; }
        bool SupportsPresignedUrls { get; }
        bool SupportsObjectLocking { get; }
        bool SupportsStorageTiering { get; }
        bool SupportsLifecyclePolicies { get; }
        bool SupportsCrossRegionReplication { get; }
        bool SupportsEventNotifications { get; }
        long MaxPartSizeBytes { get; }
        long MaxObjectSizeBytes { get; }
        int MaxConcurrentUploads { get; }
    }
}
