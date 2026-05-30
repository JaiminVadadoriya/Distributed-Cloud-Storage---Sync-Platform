using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers.Capabilities
{
    public class MinIOCapabilities : IStorageCapabilities
    {
        public bool SupportsMultipartUpload => true;
        public bool SupportsVersioning => true;
        public bool SupportsPresignedUrls => true;
        public bool SupportsObjectLocking => true;
        public bool SupportsStorageTiering => false; // MinIO native tiering is complex/different, default false for our applicationtiering
        public bool SupportsLifecyclePolicies => true;
        public bool SupportsCrossRegionReplication => true;
        public bool SupportsEventNotifications => true;
        public long MaxPartSizeBytes => 5L * 1024 * 1024 * 1024; // 5 GB
        public long MaxObjectSizeBytes => 5L * 1024 * 1024 * 1024 * 1024; // 5 TB
        public int MaxConcurrentUploads => 10;
        public string Region => "us-west-1";
        public string Jurisdiction => "US";
    }
}
