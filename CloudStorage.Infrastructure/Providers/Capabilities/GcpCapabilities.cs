using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers.Capabilities
{
    public class GcpCapabilities : IStorageCapabilities
    {
        public bool SupportsMultipartUpload => true; // GCP resumable uploads
        public bool SupportsVersioning => true;
        public bool SupportsPresignedUrls => true;
        public bool SupportsObjectLocking => true;
        public bool SupportsStorageTiering => true;
        public bool SupportsLifecyclePolicies => true;
        public bool SupportsCrossRegionReplication => true;
        public bool SupportsEventNotifications => true;
        public long MaxPartSizeBytes => 5L * 1024 * 1024 * 1024;
        public long MaxObjectSizeBytes => 5L * 1024 * 1024 * 1024 * 1024;
        public int MaxConcurrentUploads => 5;
        public string Region => "us-east1";
        public string Jurisdiction => "US";
    }
}
