using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Infrastructure.Providers.Capabilities;

namespace CloudStorage.Infrastructure.Providers.GCP
{
    public class GcpStorageProvider : IObjectStorageProvider
    {
        public string ProviderName => "GCP";

        public Task<StorageUploadResult> UploadAsync(string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            throw new NotImplementedException("GCP Storage Provider is not implemented yet.");
        }

        public Task<Stream> DownloadAsync(string objectKey, StorageDownloadOptions? options = null, CancellationToken ct = default)
        {
            throw new NotImplementedException("GCP Storage Provider is not implemented yet.");
        }

        public Task DeleteAsync(string objectKey, CancellationToken ct = default)
        {
            throw new NotImplementedException("GCP Storage Provider is not implemented yet.");
        }

        public Task<bool> ExistsAsync(string objectKey, CancellationToken ct = default)
        {
            throw new NotImplementedException("GCP Storage Provider is not implemented yet.");
        }

        public Task<StorageObjectMetadata> GetMetadataAsync(string objectKey, CancellationToken ct = default)
        {
            throw new NotImplementedException("GCP Storage Provider is not implemented yet.");
        }

        public Task<PresignedUrlResult> GeneratePresignedUploadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken ct = default)
        {
            throw new NotImplementedException("GCP Storage Provider is not implemented yet.");
        }

        public Task<PresignedUrlResult> GeneratePresignedDownloadUrlAsync(string objectKey, string? downloadFileName = null, TimeSpan? expiry = null, CancellationToken ct = default)
        {
            throw new NotImplementedException("GCP Storage Provider is not implemented yet.");
        }

        public StorageProviderCapabilities Capabilities => new StorageProviderCapabilities(
            SupportsPresignedUrls: false,
            SupportsServerSideEncryption: false,
            SupportsRangeRequests: false,
            SupportsMultipartUpload: false
        );

        public IStorageCapabilities DetailedCapabilities => new GcpCapabilities();

        public Task<bool> IsHealthyAsync(CancellationToken ct = default)
        {
            return Task.FromResult(false);
        }
    }
}
