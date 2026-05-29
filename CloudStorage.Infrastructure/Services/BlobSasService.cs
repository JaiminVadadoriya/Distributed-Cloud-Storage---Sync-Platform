using System;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Providers.Azure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Services
{
    [Obsolete("Use IObjectStorageProvider or IChunkStorageProvider")]
    public class BlobSasService : IBlobSasService
    {
        private readonly AzureBlobStorageProvider _provider;
        private readonly AzureChunkStorageProvider _chunkProvider;
        private readonly int _sasExpiryMinutes;

        public BlobSasService(BlobServiceClient blobServiceClient, IConfiguration configuration)
        {
            var logger = new LoggerFactory().CreateLogger<AzureBlobStorageProvider>();
            _provider = new AzureBlobStorageProvider(blobServiceClient, configuration, logger);
            _chunkProvider = new AzureChunkStorageProvider(_provider);
            _sasExpiryMinutes = int.TryParse(configuration["AzureBlob:SasTokenExpiryMinutes"], out int expiry) ? expiry : 15;
        }

        public async Task<SasUploadUrlResponseDto> GenerateChunkUploadSasAsync(Guid fileId, int chunkIndex)
        {
            var result = await _chunkProvider.GenerateChunkUploadUrlAsync(fileId, chunkIndex, TimeSpan.FromMinutes(_sasExpiryMinutes));
            return new SasUploadUrlResponseDto
            {
                SasUrl = result.Url,
                BlobName = result.ObjectKey,
                ExpiresAt = result.ExpiresAt
            };
        }

        public async Task<string> GenerateDownloadSasUrlAsync(string blobName, string fileName)
        {
            var result = await _provider.GeneratePresignedDownloadUrlAsync(blobName, fileName, TimeSpan.FromMinutes(_sasExpiryMinutes));
            return result.Url;
        }

        public async Task<bool> ChunkBlobExistsAsync(string blobName)
        {
            return await _provider.ExistsAsync(blobName);
        }
    }
}
