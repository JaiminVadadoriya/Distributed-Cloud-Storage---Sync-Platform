using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using CloudStorage.Application.Interfaces.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Providers.S3
{
    public class S3StorageProvider : IObjectStorageProvider
    {
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;
        private readonly int _expiryMinutes;
        private readonly ILogger<S3StorageProvider> _logger;

        public string ProviderName => "S3";

        public S3StorageProvider(
            IAmazonS3 s3Client, 
            IConfiguration configuration, 
            ILogger<S3StorageProvider> logger)
        {
            _s3Client = s3Client;
            _bucketName = configuration["StorageProvider:S3:BucketName"] ?? "cloudstorage-chunks";
            _expiryMinutes = int.TryParse(configuration["StorageProvider:PresignedUrlExpiryMinutes"], out int expiry) ? expiry : 15;
            _logger = logger;
        }

        public async Task<StorageUploadResult> UploadAsync(string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            var request = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                InputStream = data
            };

            if (options?.ContentType != null)
            {
                request.ContentType = options.ContentType;
            }

            if (options?.Metadata != null)
            {
                foreach (var kvp in options.Metadata)
                {
                    request.Metadata.Add(kvp.Key, kvp.Value);
                }
            }

            var response = await _s3Client.PutObjectAsync(request, ct);
            var storagePath = StoragePathResolver.FormatPath(ProviderName, objectKey);
            return new StorageUploadResult(objectKey, storagePath, response.ETag);
        }

        public async Task<Stream> DownloadAsync(string objectKey, StorageDownloadOptions? options = null, CancellationToken ct = default)
        {
            var request = new GetObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            };

            if (options?.RangeStart != null || options?.RangeEnd != null)
            {
                request.ByteRange = new ByteRange(options.RangeStart ?? 0, options.RangeEnd ?? -1);
            }

            var response = await _s3Client.GetObjectAsync(request, ct);
            return response.ResponseStream;
        }

        public async Task DeleteAsync(string objectKey, CancellationToken ct = default)
        {
            var request = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            };
            await _s3Client.DeleteObjectAsync(request, ct);
        }

        public async Task<bool> ExistsAsync(string objectKey, CancellationToken ct = default)
        {
            try
            {
                await _s3Client.GetObjectMetadataAsync(_bucketName, objectKey, null, ct);
                return true;
            }
            catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return false;
            }
        }

        public async Task<StorageObjectMetadata> GetMetadataAsync(string objectKey, CancellationToken ct = default)
        {
            var response = await _s3Client.GetObjectMetadataAsync(_bucketName, objectKey, null, ct);
            var metadata = new Dictionary<string, string>();
            foreach (string key in response.Metadata.Keys)
            {
                metadata[key] = response.Metadata[key];
            }

            return new StorageObjectMetadata(
                objectKey,
                response.Headers.ContentLength,
                response.Headers.ContentType,
                response.LastModified,
                metadata,
                response.ServerSideEncryptionMethod != ServerSideEncryptionMethod.None
            );
        }

        public Task<PresignedUrlResult> GeneratePresignedUploadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken ct = default)
        {
            var expires = DateTime.UtcNow.Add(expiry);
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                Verb = HttpVerb.PUT,
                Expires = expires
            };
            var url = _s3Client.GetPreSignedURL(request);
            return Task.FromResult(new PresignedUrlResult(url, expires, objectKey));
        }

        public Task<PresignedUrlResult> GeneratePresignedDownloadUrlAsync(string objectKey, string? downloadFileName = null, TimeSpan? expiry = null, CancellationToken ct = default)
        {
            var duration = expiry ?? TimeSpan.FromMinutes(_expiryMinutes);
            var expires = DateTime.UtcNow.Add(duration);
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                Verb = HttpVerb.GET,
                Expires = expires
            };

            if (!string.IsNullOrEmpty(downloadFileName))
            {
                request.ResponseHeaderOverrides.ContentDisposition = $"attachment; filename=\"{Uri.EscapeDataString(downloadFileName)}\"";
            }

            var url = _s3Client.GetPreSignedURL(request);
            return Task.FromResult(new PresignedUrlResult(url, expires, objectKey));
        }

        public StorageProviderCapabilities Capabilities => new StorageProviderCapabilities(
            SupportsPresignedUrls: true,
            SupportsServerSideEncryption: true,
            SupportsRangeRequests: true,
            SupportsMultipartUpload: true
        );

        public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
        {
            try
            {
                await AmazonS3Util.DoesS3BucketExistV2Async(_s3Client, _bucketName);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "S3 health check failed for bucket {BucketName}", _bucketName);
                return false;
            }
        }
    }
}
