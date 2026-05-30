using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers.Capabilities
{
    public class AzureCapabilities : IStorageCapabilities
    {
        public bool SupportsMultipartUpload => true; // Azure Block Blobs support blocking/staging which works like multipart
        public bool SupportsVersioning => true;
        public bool SupportsPresignedUrls => true; // SAS URLs
        public bool SupportsObjectLocking => true; // Immutability policy
        public bool SupportsStorageTiering => true;
        public bool SupportsLifecyclePolicies => true;
        public bool SupportsCrossRegionReplication => true;
        public bool SupportsEventNotifications => true;
        public long MaxPartSizeBytes => 4000L * 1024 * 1024; // 4000 MB
        public long MaxObjectSizeBytes => 4750000000000L; // ~4.75 TB
        public int MaxConcurrentUploads => 8;
    }
}
