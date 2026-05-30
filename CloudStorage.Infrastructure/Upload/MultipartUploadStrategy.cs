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
                var partList = new System.Collections.Generic.List<PartETag>();

                try
                {
                    var buffer = new byte[5 * 1024 * 1024]; // 5MB parts
                    int bytesRead;
                    int partNumber = 1;

                    while ((bytesRead = await data.ReadAsync(buffer, 0, buffer.Length, ct)) > 0)
                    {
                        using var ms = new MemoryStream(buffer, 0, bytesRead);
                        var partRequest = new UploadPartRequest
                        {
                            BucketName = bucketName,
                            Key = objectKey,
                            UploadId = uploadId,
                            PartNumber = partNumber,
                            PartSize = bytesRead,
                            InputStream = ms
                        };

                        var partResponse = await _s3Client.UploadPartAsync(partRequest, ct);
                        partList.Add(new PartETag(partNumber, partResponse.ETag));
                        partNumber++;
                    }

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
