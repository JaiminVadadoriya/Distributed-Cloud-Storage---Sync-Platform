using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Storage
{
    public interface IObjectStorageProvider
    {
        string ProviderName { get; }
        
        Task<StorageUploadResult> UploadAsync(string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default);
        Task<Stream> DownloadAsync(string objectKey, StorageDownloadOptions? options = null, CancellationToken ct = default);
        Task DeleteAsync(string objectKey, CancellationToken ct = default);
        Task<bool> ExistsAsync(string objectKey, CancellationToken ct = default);
        Task<StorageObjectMetadata> GetMetadataAsync(string objectKey, CancellationToken ct = default);
        
        Task<PresignedUrlResult> GeneratePresignedUploadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken ct = default);
        Task<PresignedUrlResult> GeneratePresignedDownloadUrlAsync(string objectKey, string? downloadFileName = null, TimeSpan? expiry = null, CancellationToken ct = default);
        
        StorageProviderCapabilities Capabilities { get; }
        IStorageCapabilities DetailedCapabilities { get; }
        
        Task<bool> IsHealthyAsync(CancellationToken ct = default);
    }
}
