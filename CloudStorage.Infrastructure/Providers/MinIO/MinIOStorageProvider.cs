using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Minio;
using Minio.DataModel.Args;

namespace CloudStorage.Infrastructure.Providers.MinIO
{
    public class MinIOStorageProvider : IObjectStorageProvider
    {
        private readonly IMinioClient _minioClient;
        private readonly string _bucketName;
        private readonly int _expiryMinutes;
        private readonly ILogger<MinIOStorageProvider> _logger;

        public string ProviderName => "MinIO";

        public MinIOStorageProvider(
            IMinioClient minioClient, 
            IConfiguration configuration, 
            ILogger<MinIOStorageProvider> logger)
        {
            _minioClient = minioClient;
            _bucketName = configuration["StorageProvider:MinIO:BucketName"] ?? "cloudstorage-chunks";
            _expiryMinutes = int.TryParse(configuration["StorageProvider:PresignedUrlExpiryMinutes"], out int expiry) ? expiry : 15;
            _logger = logger;
        }

        private async Task EnsureBucketExistsAsync(CancellationToken ct)
        {
            try
            {
                var existsArgs = new BucketExistsArgs().WithBucket(_bucketName);
                var exists = await _minioClient.BucketExistsAsync(existsArgs, ct);
                if (!exists)
                {
                    var makeArgs = new MakeBucketArgs().WithBucket(_bucketName);
                    await _minioClient.MakeBucketAsync(makeArgs, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to ensure MinIO bucket {BucketName} exists", _bucketName);
            }
        }

        public async Task<StorageUploadResult> UploadAsync(string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            await EnsureBucketExistsAsync(ct);

            // Minio Client PutObjectAsync requires knowing the size if possible, or -1 for unknown length
            long size = -1;
            try
            {
                if (data.CanSeek)
                {
                    size = data.Length;
                }
            }
            catch
            {
                // ignore
            }

            var putArgs = new PutObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(objectKey)
                .WithStreamData(data)
                .WithObjectSize(size)
                .WithContentType(options?.ContentType ?? "application/octet-stream");

            if (options?.Metadata != null)
            {
                putArgs.WithHeaders(options.Metadata);
            }

            var response = await _minioClient.PutObjectAsync(putArgs, ct);
            var storagePath = StoragePathResolver.FormatPath(ProviderName, objectKey);
            return new StorageUploadResult(objectKey, storagePath, response.Etag);
        }

        public async Task<Stream> DownloadAsync(string objectKey, StorageDownloadOptions? options = null, CancellationToken ct = default)
        {
            var memoryStream = new MemoryStream();
            
            var getArgs = new GetObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(objectKey)
                .WithCallbackStream((stream) =>
                {
                    stream.CopyTo(memoryStream);
                });

            // Note: Range requests in MinIO SDK can be done via headers
            if (options?.RangeStart != null || options?.RangeEnd != null)
            {
                var start = options.RangeStart ?? 0;
                var end = options.RangeEnd.HasValue ? options.RangeEnd.Value.ToString() : "";
                var headers = new Dictionary<string, string>
                {
                    { "Range", $"bytes={start}-{end}" }
                };
                getArgs.WithHeaders(headers);
            }

            await _minioClient.GetObjectAsync(getArgs, ct);
            memoryStream.Position = 0;
            return memoryStream;
        }

        public async Task DeleteAsync(string objectKey, CancellationToken ct = default)
        {
            var removeArgs = new RemoveObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(objectKey);
            await _minioClient.RemoveObjectAsync(removeArgs, ct);
        }

        public async Task<bool> ExistsAsync(string objectKey, CancellationToken ct = default)
        {
            try
            {
                var statArgs = new StatObjectArgs()
                    .WithBucket(_bucketName)
                    .WithObject(objectKey);
                await _minioClient.StatObjectAsync(statArgs, ct);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<StorageObjectMetadata> GetMetadataAsync(string objectKey, CancellationToken ct = default)
        {
            var statArgs = new StatObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(objectKey);
            var stat = await _minioClient.StatObjectAsync(statArgs, ct);

            return new StorageObjectMetadata(
                objectKey,
                stat.Size,
                stat.ContentType,
                stat.LastModified,
                stat.MetaData,
                false // Encryption check would be provider-specific
            );
        }

        public async Task<PresignedUrlResult> GeneratePresignedUploadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken ct = default)
        {
            await EnsureBucketExistsAsync(ct);

            var expiresAt = DateTime.UtcNow.Add(expiry);
            var args = new PresignedPutObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(objectKey)
                .WithExpiry((int)expiry.TotalSeconds);

            var url = await _minioClient.PresignedPutObjectAsync(args);
            return new PresignedUrlResult(url, expiresAt, objectKey);
        }

        public async Task<PresignedUrlResult> GeneratePresignedDownloadUrlAsync(string objectKey, string? downloadFileName = null, TimeSpan? expiry = null, CancellationToken ct = default)
        {
            var duration = expiry ?? TimeSpan.FromMinutes(_expiryMinutes);
            var expiresAt = DateTime.UtcNow.Add(duration);
            
            var args = new PresignedGetObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(objectKey)
                .WithExpiry((int)duration.TotalSeconds);

            if (!string.IsNullOrEmpty(downloadFileName))
            {
                var headers = new Dictionary<string, string>
                {
                    { "response-content-disposition", $"attachment; filename=\"{Uri.EscapeDataString(downloadFileName)}\"" }
                };
                args.WithHeaders(headers);
            }

            var url = await _minioClient.PresignedGetObjectAsync(args);
            return new PresignedUrlResult(url, expiresAt, objectKey);
        }

        public StorageProviderCapabilities Capabilities => new StorageProviderCapabilities(
            SupportsPresignedUrls: true,
            SupportsServerSideEncryption: false, // MinIO supports SSE, but we don't configure it in details here
            SupportsRangeRequests: true,
            SupportsMultipartUpload: true
        );

        public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
        {
            try
            {
                var args = new BucketExistsArgs().WithBucket(_bucketName);
                return await _minioClient.BucketExistsAsync(args, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MinIO health check failed for bucket {BucketName}", _bucketName);
                return false;
            }
        }
    }
}
