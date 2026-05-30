using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Infrastructure.Providers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Upload
{
    public class BlockBlobUploadStrategy : IUploadStrategy
    {
        private readonly BlobServiceClient? _blobServiceClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BlockBlobUploadStrategy> _logger;
        private readonly IStorageProviderFactory _providerFactory;

        public BlockBlobUploadStrategy(
            IConfiguration configuration,
            ILogger<BlockBlobUploadStrategy> logger,
            IStorageProviderFactory providerFactory,
            BlobServiceClient? blobServiceClient = null)
        {
            _configuration = configuration;
            _logger = logger;
            _providerFactory = providerFactory;
            _blobServiceClient = blobServiceClient;
        }

        public string StrategyName => "BlockBlob";

        public virtual async Task<StorageUploadResult> ExecuteAsync(string providerName, string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            var provider = _providerFactory.GetProvider(providerName);
            if (string.Equals(providerName, "azure", StringComparison.OrdinalIgnoreCase) && _blobServiceClient != null)
            {
                var containerName = _configuration["StorageProvider:Azure:ContainerName"] ?? "cloudstorage-chunks";
                _logger.LogInformation("Initiating Azure BlockBlob stage/commit upload for {ObjectKey}", objectKey);
                
                var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
                var blockBlobClient = containerClient.GetBlockBlobClient(objectKey);

                var blockIds = new System.Collections.Generic.List<string>();

                try
                {
                    var buffer = new byte[4 * 1024 * 1024]; // 4MB blocks
                    int bytesRead;
                    int blockNumber = 0;

                    while ((bytesRead = await data.ReadAsync(buffer, 0, buffer.Length, ct)) > 0)
                    {
                        using var ms = new MemoryStream(buffer, 0, bytesRead);
                        var blockId = Convert.ToBase64String(Encoding.UTF8.GetBytes(blockNumber.ToString("D6")));
                        
                        await blockBlobClient.StageBlockAsync(blockId, ms, cancellationToken: ct);
                        blockIds.Add(blockId);
                        blockNumber++;
                    }

                    var headers = new BlobHttpHeaders { ContentType = options?.ContentType };
                    await blockBlobClient.CommitBlockListAsync(blockIds, new CommitBlockListOptions { HttpHeaders = headers }, cancellationToken: ct);

                    var storagePath = StoragePathResolver.FormatPath(providerName, objectKey);
                    return new StorageUploadResult(objectKey, storagePath, null);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Azure BlockBlob upload failed for {ObjectKey}", objectKey);
                    throw;
                }
            }

            return await provider.UploadAsync(objectKey, data, options, ct);
        }
    }
}
