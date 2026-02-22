using System;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CloudStorage.Infrastructure.Services
{
    public class BlobSasService : IBlobSasService
    {
        private readonly BlobServiceClient _blobServiceClient;
        private readonly string _containerName;
        private readonly int _sasExpiryMinutes;

        public BlobSasService(BlobServiceClient blobServiceClient, IConfiguration configuration)
        {
            _blobServiceClient = blobServiceClient;
            _containerName = configuration["AzureBlob:ContainerName"] ?? "cloudstorage-chunks";
            _sasExpiryMinutes = int.TryParse(configuration["AzureBlob:SasTokenExpiryMinutes"], out int expiry) ? expiry : 15;
        }

        public async Task<SasUploadUrlResponseDto> GenerateChunkUploadSasAsync(Guid fileId, int chunkIndex)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            await containerClient.CreateIfNotExistsAsync();

            var blobName = $"{fileId}/{chunkIndex}.chunk";
            var blobClient = containerClient.GetBlobClient(blobName);

            var sasBuilder = new BlobSasBuilder
            {
                BlobContainerName = _containerName,
                BlobName = blobName,
                Resource = "b",
                StartsOn = DateTimeOffset.UtcNow.AddMinutes(-1), // Account for clock skew
                ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(_sasExpiryMinutes)
            };
            
            sasBuilder.SetPermissions(BlobSasPermissions.Write);

            var sasUri = blobClient.GenerateSasUri(sasBuilder);

            return new SasUploadUrlResponseDto
            {
                SasUrl = sasUri.ToString(),
                BlobName = blobName,
                ExpiresAt = sasBuilder.ExpiresOn.UtcDateTime
            };
        }

        public async Task<bool> ChunkBlobExistsAsync(string blobName)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(blobName);
            return await blobClient.ExistsAsync();
        }
    }
}
