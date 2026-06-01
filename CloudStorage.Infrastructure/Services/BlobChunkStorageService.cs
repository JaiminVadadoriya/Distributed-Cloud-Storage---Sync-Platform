using System;
using System.IO;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Providers.Azure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Services
{
    [Obsolete("Use IChunkStorageProvider")]
    public class BlobChunkStorageService : IChunkStorageService
    {
        private readonly AzureBlobStorageProvider _provider;
        private readonly AzureChunkStorageProvider _chunkProvider;
        private readonly IBlobSasService _sasService;
        private readonly BlobServiceClient _blobServiceClient;
        private readonly string _containerName;

        public BlobChunkStorageService(
            BlobServiceClient blobServiceClient,
            IBlobSasService sasService,
            IConfiguration configuration,
            ILogger<BlobChunkStorageService> logger)
        {
            var loggerProvider = new LoggerFactory().CreateLogger<AzureBlobStorageProvider>();
            _provider = new AzureBlobStorageProvider(blobServiceClient, configuration, loggerProvider);
            _chunkProvider = new AzureChunkStorageProvider(_provider);
            _sasService = sasService;
            _blobServiceClient = blobServiceClient;
            _containerName = configuration["AzureBlob:ContainerName"] ?? "cloudstorage-chunks";
        }

        public async Task<string> GenerateSasUploadUrlAsync(Guid fileId, int chunkIndex, TimeSpan expiry)
        {
            var response = await _sasService.GenerateChunkUploadSasAsync(fileId, chunkIndex);
            return response.SasUrl;
        }

        public async Task<string> SaveChunkAsync(Guid fileId, int chunkIndex, Stream chunkData)
        {
            await _chunkProvider.SaveChunkAsync(fileId, chunkIndex, chunkData);
            
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient($"{fileId}/{chunkIndex}.chunk");
            return blobClient.Uri.ToString();
        }

        public async Task<bool> ChunkExistsAsync(string hash)
        {
            return await Task.FromResult(false);
        }

        public async Task<Stream> GetChunkAsync(string storagePath)
        {
            return await _chunkProvider.GetChunkAsync(storagePath);
        }

        public async Task DeleteChunkAsync(string storagePath)
        {
            await _chunkProvider.DeleteChunkAsync(storagePath);
        }

        public async Task<bool> VerifyEncryptionStatusAsync(Guid fileId, int chunkIndex)
        {
            var key = $"{fileId}/{chunkIndex}.chunk";
            var metadata = await _provider.GetMetadataAsync(key);
            return metadata.IsEncrypted ?? false;
        }
    }
}
