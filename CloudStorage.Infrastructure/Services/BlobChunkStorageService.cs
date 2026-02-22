using System;
using System.IO;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CloudStorage.Infrastructure.Services
{
    public class BlobChunkStorageService : IChunkStorageService
    {
        private readonly BlobServiceClient _blobServiceClient;
        private readonly IBlobSasService _sasService;
        private readonly string _containerName;

        public BlobChunkStorageService(
            BlobServiceClient blobServiceClient,
            IBlobSasService sasService,
            IConfiguration configuration)
        {
            _blobServiceClient = blobServiceClient;
            _sasService = sasService;
            _containerName = configuration["AzureBlob:ContainerName"] ?? "cloudstorage-chunks";
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
    }
}
