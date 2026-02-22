using System;
using System.IO;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Services
{
    public class BlobChunkStorageService : IChunkStorageService
    {
        private readonly BlobServiceClient _blobServiceClient;
        private readonly IBlobSasService _sasService;
        private readonly string _containerName;
        private readonly ILogger<BlobChunkStorageService> _logger;

        public BlobChunkStorageService(
            BlobServiceClient blobServiceClient,
            IBlobSasService sasService,
            IConfiguration configuration,
            ILogger<BlobChunkStorageService> logger)
        {
            _blobServiceClient = blobServiceClient;
            _sasService = sasService;
            _containerName = configuration["AzureBlob:ContainerName"] ?? "cloudstorage-chunks";
            _logger = logger;
        }

        public async Task<string> GenerateSasUploadUrlAsync(Guid fileId, int chunkIndex, TimeSpan expiry)
        {
            var response = await _sasService.GenerateChunkUploadSasAsync(fileId, chunkIndex);
            return response.SasUrl;
        }

        public async Task<string> SaveChunkAsync(Guid fileId, int chunkIndex, Stream chunkData)
        {
            // This handles server-proxied uploads
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            await containerClient.CreateIfNotExistsAsync();

            var blobName = $"{fileId}/{chunkIndex}.chunk";
            var blobClient = containerClient.GetBlobClient(blobName);

            await blobClient.UploadAsync(chunkData, overwrite: true);

            // Verify Azure Server-Side Encryption (SSE) is active
            var properties = await blobClient.GetPropertiesAsync();
            if (properties.Value.IsServerEncrypted)
            {
                _logger.LogDebug("Chunk {BlobName} is server-side encrypted (SSE)", blobName);
            }
            else
            {
                _logger.LogWarning("Chunk {BlobName} is NOT server-side encrypted — review Azure storage account settings", blobName);
            }

            return blobClient.Uri.ToString();
        }

        public async Task<bool> ChunkExistsAsync(string hash)
        {
            // Placeholder: Deduplication logic handles checking via IDeduplicationService and Registry
            return await Task.FromResult(false);
        }

        public async Task<Stream> GetChunkAsync(string storagePath)
        {
            var uri = new Uri(storagePath);
            // The storagePath is expected to be the full Blob URI in the proxy case, or just the blob mapping.
            // For robustness, extract blob name assuming storagePath ends with {containerName}/{blobName}.
            var pathParts = storagePath.Split($"{_containerName}/");
            var blobName = pathParts.Length > 1 ? pathParts[1] : uri.Segments[^2] + uri.Segments[^1];
            
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            var response = await blobClient.DownloadStreamingAsync();
            return response.Value.Content;
        }

        public async Task DeleteChunkAsync(string storagePath)
        {
            var uri = new Uri(storagePath);
            var pathParts = storagePath.Split($"{_containerName}/");
            var blobName = pathParts.Length > 1 ? pathParts[1] : uri.Segments[^2] + uri.Segments[^1];
            
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            await blobClient.DeleteIfExistsAsync();
        }

        /// <summary>
        /// Audit method: verifies that a specific chunk blob has Azure SSE enabled.
        /// </summary>
        public async Task<bool> VerifyEncryptionStatusAsync(Guid fileId, int chunkIndex)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobName = $"{fileId}/{chunkIndex}.chunk";
            var blobClient = containerClient.GetBlobClient(blobName);

            if (!await blobClient.ExistsAsync())
            {
                _logger.LogWarning("Blob {BlobName} does not exist for encryption verification", blobName);
                return false;
            }

            var properties = await blobClient.GetPropertiesAsync();
            var isEncrypted = properties.Value.IsServerEncrypted;
            _logger.LogInformation("Blob {BlobName} encryption status: {IsEncrypted}", blobName, isEncrypted);
            return isEncrypted;
        }
    }
}
