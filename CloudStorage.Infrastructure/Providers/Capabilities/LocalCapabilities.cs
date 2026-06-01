using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers.Capabilities
{
    public class LocalCapabilities : IStorageCapabilities
    {
        public bool SupportsMultipartUpload => false;
        public bool SupportsVersioning => false;
        public bool SupportsPresignedUrls => false;
        public bool SupportsObjectLocking => false;
        public bool SupportsStorageTiering => false;
        public bool SupportsLifecyclePolicies => false;
        public bool SupportsCrossRegionReplication => false;
        public bool SupportsEventNotifications => false;
        public long MaxPartSizeBytes => 0;
        public long MaxObjectSizeBytes => 100 * 1024 * 1024 * 1024L; // 100 GB
        public int MaxConcurrentUploads => 1;
        public string Region => "local";
        public string Jurisdiction => "Local";
    }
}
