using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Infrastructure.Providers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Upload
{
    public class MultipartUploadStrategy : IUploadStrategy
    {
        private readonly IAmazonS3? _s3Client;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MultipartUploadStrategy> _logger;
        private readonly IStorageProviderFactory _providerFactory;

        public MultipartUploadStrategy(
            IConfiguration configuration,
            ILogger<MultipartUploadStrategy> logger,
            IStorageProviderFactory providerFactory,
            IAmazonS3? s3Client = null)
        {
            _configuration = configuration;
            _logger = logger;
            _providerFactory = providerFactory;
            _s3Client = s3Client;
        }

        public string StrategyName => "Multipart";

        public virtual async Task<StorageUploadResult> ExecuteAsync(string providerName, string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            var provider = _providerFactory.GetProvider(providerName);
            if (string.Equals(providerName, "s3", StringComparison.OrdinalIgnoreCase) && _s3Client != null)
            {
                var bucketName = _configuration["StorageProvider:S3:BucketName"] ?? "cloudstorage-chunks";
                
                _logger.LogInformation("Initiating low-level S3 Multipart Upload for {ObjectKey}", objectKey);
                
                var initRequest = new InitiateMultipartUploadRequest
                {
                    BucketName = bucketName,
                    Key = objectKey,
                    ContentType = options?.ContentType
                };

                var initResponse = await _s3Client.InitiateMultipartUploadAsync(initRequest, ct);
                var uploadId = initResponse.UploadId;
                var partTasks = new System.Collections.Generic.List<Task>();
                var partList = new System.Collections.Generic.List<PartETag>();
                using var semaphore = new SemaphoreSlim(4);
                var listLock = new object();

                try
                {
                    const int partSize = 5 * 1024 * 1024;
                    int partNumber = 1;

                    while (true)
                    {
                        var chunkBuffer = new byte[partSize];
                        int bytesRead = 0;
                        int offset = 0;
                        int remaining = partSize;

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
                        if (bytesRead < partSize)
                        {
                            uploadBuffer = new byte[bytesRead];
                            Buffer.BlockCopy(chunkBuffer, 0, uploadBuffer, 0, bytesRead);
                        }

                        var currentPartNumber = partNumber;
                        partTasks.Add(Task.Run(async () =>
                        {
                            await semaphore.WaitAsync(ct);
                            try
                            {
                                using var ms = new MemoryStream(uploadBuffer);
                                var partRequest = new UploadPartRequest
                                {
                                    BucketName = bucketName,
                                    Key = objectKey,
                                    UploadId = uploadId,
                                    PartNumber = currentPartNumber,
                                    PartSize = uploadBuffer.Length,
                                    InputStream = ms
                                };

                                var partResponse = await _s3Client.UploadPartAsync(partRequest, ct);
                                lock (listLock)
                                {
                                    partList.Add(new PartETag(currentPartNumber, partResponse.ETag));
                                }
                            }
                            finally
                            {
                                semaphore.Release();
                            }
                        }, ct));

                        partNumber++;
                    }

                    await Task.WhenAll(partTasks);
                    partList.Sort((x, y) => x.PartNumber.GetValueOrDefault().CompareTo(y.PartNumber.GetValueOrDefault()));

                    var completeRequest = new CompleteMultipartUploadRequest
                    {
                        BucketName = bucketName,
                        Key = objectKey,
                        UploadId = uploadId,
                        PartETags = partList
                    };

                    await _s3Client.CompleteMultipartUploadAsync(completeRequest, ct);
                    
                    var storagePath = StoragePathResolver.FormatPath(providerName, objectKey);
                    return new StorageUploadResult(objectKey, storagePath, null);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "S3 Multipart Upload failed for {ObjectKey}. Aborting.", objectKey);
                    var abortRequest = new AbortMultipartUploadRequest
                    {
                        BucketName = bucketName,
                        Key = objectKey,
                        UploadId = uploadId
                    };
                    await _s3Client.AbortMultipartUploadAsync(abortRequest, ct);
                    throw;
                }
            }

            return await provider.UploadAsync(objectKey, data, options, ct);
        }
    }
}
