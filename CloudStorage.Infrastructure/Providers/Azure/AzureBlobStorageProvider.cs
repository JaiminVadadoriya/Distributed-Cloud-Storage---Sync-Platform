using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using CloudStorage.Application.Interfaces.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Providers.Azure
{
    public class AzureBlobStorageProvider : IObjectStorageProvider
    {
        private readonly BlobServiceClient _blobServiceClient;
        private readonly string _containerName;
        private readonly int _sasExpiryMinutes;
        private readonly ILogger<AzureBlobStorageProvider> _logger;

        public string ProviderName => "Azure";

        public AzureBlobStorageProvider(
            BlobServiceClient blobServiceClient, 
            IConfiguration configuration, 
            ILogger<AzureBlobStorageProvider> logger)
        {
            _blobServiceClient = blobServiceClient;
            _containerName = configuration["StorageProvider:Azure:ContainerName"] ?? configuration["AzureBlob:ContainerName"] ?? "cloudstorage-chunks";
            _sasExpiryMinutes = int.TryParse(configuration["StorageProvider:PresignedUrlExpiryMinutes"] ?? configuration["AzureBlob:SasTokenExpiryMinutes"], out int expiry) ? expiry : 15;
            _logger = logger;
        }

        public async Task<StorageUploadResult> UploadAsync(string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            await containerClient.CreateIfNotExistsAsync(cancellationToken: ct);
            var blobClient = containerClient.GetBlobClient(objectKey);

            Response<BlobContentInfo> response;
            if (options?.ContentType == null && (options?.Metadata == null || options.Metadata.Count == 0))
            {
                response = await blobClient.UploadAsync(data, overwrite: options?.Overwrite ?? true, cancellationToken: ct);
            }
            else
            {
                var uploadOptions = new BlobUploadOptions();
                if (options.ContentType != null)
                {
                    uploadOptions.HttpHeaders = new BlobHttpHeaders { ContentType = options.ContentType };
                }
                if (options.Metadata != null)
                {
                    uploadOptions.Metadata = options.Metadata;
                }
                response = await blobClient.UploadAsync(data, uploadOptions, ct);
            }

            // Log / check server-side encryption
            try
            {
                var properties = await blobClient.GetPropertiesAsync(cancellationToken: ct);
                if (properties.Value.IsServerEncrypted)
                {
                    _logger.LogDebug("Chunk {BlobName} is server-side encrypted (SSE)", objectKey);
                }
                else
                {
                    _logger.LogWarning("Chunk {BlobName} is NOT server-side encrypted — review Azure storage account settings", objectKey);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to retrieve properties to verify encryption for chunk {BlobName}", objectKey);
            }

            var etag = response?.Value?.ETag.ToString();
            var storagePath = StoragePathResolver.FormatPath(ProviderName, objectKey);
            return new StorageUploadResult(objectKey, storagePath, etag);
        }

        public async Task<Stream> DownloadAsync(string objectKey, StorageDownloadOptions? options = null, CancellationToken ct = default)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(objectKey);

            if (options?.RangeStart != null || options?.RangeEnd != null)
            {
                var range = new HttpRange(options.RangeStart ?? 0, options.RangeEnd.HasValue ? (options.RangeEnd.Value - (options.RangeStart ?? 0) + 1) : null);
                var response = await blobClient.DownloadStreamingAsync(range, null, false, ct);
                return response.Value.Content;
            }
            else
            {
                var response = await blobClient.DownloadStreamingAsync(cancellationToken: ct);
                return response.Value.Content;
            }
        }

        public async Task DeleteAsync(string objectKey, CancellationToken ct = default)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(objectKey);
            await blobClient.DeleteIfExistsAsync(cancellationToken: ct);
        }

        public async Task<bool> ExistsAsync(string objectKey, CancellationToken ct = default)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(objectKey);
            return await blobClient.ExistsAsync(cancellationToken: ct);
        }

        public async Task<StorageObjectMetadata> GetMetadataAsync(string objectKey, CancellationToken ct = default)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(objectKey);
            var properties = await blobClient.GetPropertiesAsync(cancellationToken: ct);
            return new StorageObjectMetadata(
                objectKey,
                properties.Value.ContentLength,
                properties.Value.ContentType,
                properties.Value.LastModified.UtcDateTime,
                properties.Value.Metadata,
                properties.Value.IsServerEncrypted
            );
        }

        public async Task<PresignedUrlResult> GeneratePresignedUploadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken ct = default)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            await containerClient.CreateIfNotExistsAsync(cancellationToken: ct);
            var blobClient = containerClient.GetBlobClient(objectKey);

            var sasBuilder = new BlobSasBuilder
            {
                BlobContainerName = _containerName,
                BlobName = objectKey,
                Resource = "b",
                StartsOn = DateTimeOffset.UtcNow.AddMinutes(-1),
                ExpiresOn = DateTimeOffset.UtcNow.Add(expiry)
            };
            sasBuilder.SetPermissions(BlobSasPermissions.Write);

            var sasUri = blobClient.GenerateSasUri(sasBuilder);
            return new PresignedUrlResult(sasUri.ToString(), sasBuilder.ExpiresOn.UtcDateTime, objectKey);
        }

        public async Task<PresignedUrlResult> GeneratePresignedDownloadUrlAsync(string objectKey, string? downloadFileName = null, TimeSpan? expiry = null, CancellationToken ct = default)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(objectKey);

            var duration = expiry ?? TimeSpan.FromMinutes(_sasExpiryMinutes);
            var sasBuilder = new BlobSasBuilder
            {
                BlobContainerName = _containerName,
                BlobName = objectKey,
                Resource = "b",
                StartsOn = DateTimeOffset.UtcNow.AddMinutes(-5),
                ExpiresOn = DateTimeOffset.UtcNow.Add(duration)
            };
            sasBuilder.SetPermissions(BlobSasPermissions.Read);

            if (!string.IsNullOrEmpty(downloadFileName))
            {
                sasBuilder.ContentDisposition = $"attachment; filename=\"{Uri.EscapeDataString(downloadFileName)}\"";
            }

            var sasUri = blobClient.GenerateSasUri(sasBuilder);
            return new PresignedUrlResult(sasUri.ToString(), sasBuilder.ExpiresOn.UtcDateTime, objectKey);
        }

        public StorageProviderCapabilities Capabilities => new StorageProviderCapabilities(
            SupportsPresignedUrls: true,
            SupportsServerSideEncryption: true,
            SupportsRangeRequests: true,
            SupportsMultipartUpload: true
        );

        public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
                await containerClient.ExistsAsync(cancellationToken: ct);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Azure Blob health check failed");
                return false;
            }
        }
    }
}
