using System;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Infrastructure.Providers.Capabilities;

namespace CloudStorage.Infrastructure.Providers
{
    public class CapabilityNegotiator : ICapabilityNegotiator
    {
        public IStorageCapabilities GetCapabilities(string providerName)
        {
            return providerName?.ToLowerInvariant() switch
            {
                "azure" or "azureblob" => new AzureCapabilities(),
                "s3" => new S3Capabilities(),
                "minio" => new MinIOCapabilities(),
                "local" => new LocalCapabilities(),
                "gcp" => new GcpCapabilities(),
                _ => throw new ArgumentException($"Unknown storage provider: {providerName}", nameof(providerName))
            };
        }

        public bool SupportsFeature(string providerName, string featureName)
        {
            try
            {
                var caps = GetCapabilities(providerName);
                var cleanFeature = featureName?.ToLowerInvariant().Replace("supports", "");
                return cleanFeature switch
                {
                    "multipartupload" => caps.SupportsMultipartUpload,
                    "versioning" => caps.SupportsVersioning,
                    "presignedurls" => caps.SupportsPresignedUrls,
                    "objectlocking" => caps.SupportsObjectLocking,
                    "storagetiering" => caps.SupportsStorageTiering,
                    "lifecyclepolicies" => caps.SupportsLifecyclePolicies,
                    "crossregionreplication" => caps.SupportsCrossRegionReplication,
                    "eventnotifications" => caps.SupportsEventNotifications,
                    _ => false
                };
            }
            catch
            {
                return false;
            }
        }

        public UploadStrategyType ResolveUploadStrategy(string providerName, long fileSizeBytes)
        {
            var provider = providerName?.ToLowerInvariant();
            if (provider != "local" && provider != "s3" && provider != "minio" && provider != "azure" && provider != "azureblob" && provider != "gcp")
            {
                throw new System.Collections.Generic.KeyNotFoundException($"Unknown storage provider: {providerName}");
            }

            if (provider == "local")
            {
                return UploadStrategyType.Stream;
            }

            // File < 5MB -> Stream
            if (fileSizeBytes < 5 * 1024 * 1024)
            {
                return UploadStrategyType.Stream;
            }

            return provider switch
            {
                "s3" => UploadStrategyType.Multipart,
                "minio" => UploadStrategyType.Multipart,
                "azure" or "azureblob" => UploadStrategyType.BlockBlob,
                "gcp" => UploadStrategyType.Resumable,
                _ => UploadStrategyType.Stream
            };
        }
    }
}
