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

                var blockTasks = new System.Collections.Generic.List<Task>();
                var blockIds = new System.Collections.Generic.List<string>();
                using var semaphore = new SemaphoreSlim(4);
                var listLock = new object();

                try
                {
                    const int blockSize = 4 * 1024 * 1024;
                    int blockNumber = 0;

                    while (true)
                    {
                        var chunkBuffer = new byte[blockSize];
                        int bytesRead = 0;
                        int offset = 0;
                        int remaining = blockSize;

                        while (remaining > 0)
                        {
                            int read = await data.ReadAsync(chunkBuffer, offset, remaining, ct);
                            if (read <= 0) break;
                            bytesRead += read;
                            offset += read;
                            remaining -= read;
                        }

                        if (bytesRead == 0) break;

                        var uploadBuffer = chunkBuffer;
                        if (bytesRead < blockSize)
                        {
                            uploadBuffer = new byte[bytesRead];
                            Buffer.BlockCopy(chunkBuffer, 0, uploadBuffer, 0, bytesRead);
                        }

                        var blockId = Convert.ToBase64String(Encoding.UTF8.GetBytes(blockNumber.ToString("D6")));
                        lock (listLock)
                        {
                            blockIds.Add(blockId);
                        }

                        var currentBlockId = blockId;
                        blockTasks.Add(Task.Run(async () =>
                        {
                            await semaphore.WaitAsync(ct);
                            try
                            {
                                using var ms = new MemoryStream(uploadBuffer);
                                await blockBlobClient.StageBlockAsync(currentBlockId, ms, cancellationToken: ct);
                            }
                            finally
                            {
                                semaphore.Release();
                            }
                        }, ct));

                        blockNumber++;
                    }

                    await Task.WhenAll(blockTasks);

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
