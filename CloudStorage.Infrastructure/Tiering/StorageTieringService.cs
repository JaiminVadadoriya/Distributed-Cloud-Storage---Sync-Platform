using System;
using System.Threading;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Tiering;
using CloudStorage.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Tiering
{
    public class StorageTieringService : IStorageTieringService
    {
        private readonly BlobServiceClient? _blobServiceClient;
        private readonly IAmazonS3? _s3Client;
        private readonly IConfiguration _configuration;
        private readonly ILogger<StorageTieringService> _logger;

        public StorageTieringService(
            IConfiguration configuration,
            ILogger<StorageTieringService> logger,
            BlobServiceClient? blobServiceClient = null,
            IAmazonS3? s3Client = null)
        {
            _configuration = configuration;
            _logger = logger;
            _blobServiceClient = blobServiceClient;
            _s3Client = s3Client;
        }

        public async Task<TierTransitionResult> MoveToTierAsync(string providerName, string objectKey, StorageTier targetTier, CancellationToken ct = default)
        {
            var provider = providerName.ToLowerInvariant();
            _logger.LogInformation("Transitioning {ObjectKey} to {Tier} on {Provider}", objectKey, targetTier, providerName);

            try
            {
                StorageTier fromTier = StorageTier.Hot;

                if (provider == "azure")
                {
                    if (_blobServiceClient == null)
                    {
                        throw new InvalidOperationException("Azure BlobServiceClient is not registered.");
                    }
                    var containerName = _configuration["StorageProvider:Azure:ContainerName"] ?? "cloudstorage-chunks";
                    var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
                    var blobClient = containerClient.GetBlobClient(objectKey);

                    // Fetch current tier first
                    var properties = await blobClient.GetPropertiesAsync(cancellationToken: ct);
                    fromTier = MapAzureTier(properties.Value.AccessTier);

                    AccessTier azureTier = targetTier switch
                    {
                        StorageTier.Hot => AccessTier.Hot,
                        StorageTier.Warm => AccessTier.Cool,
                        StorageTier.Cold => AccessTier.Cold,
                        StorageTier.Archive => AccessTier.Archive,
                        _ => throw new ArgumentException($"Unsupported tier {targetTier}", nameof(targetTier))
                    };

                    await blobClient.SetAccessTierAsync(azureTier, cancellationToken: ct);
                }
                else if (provider == "s3")
                {
                    if (_s3Client == null)
                    {
                        throw new InvalidOperationException("Amazon S3 client is not registered.");
                    }
                    var bucketName = _configuration["StorageProvider:S3:BucketName"] ?? "cloudstorage-chunks";

                    // Fetch current storage class
                    var metadata = await _s3Client.GetObjectMetadataAsync(bucketName, objectKey, ct);
                    fromTier = MapS3StorageClass(metadata.StorageClass);

                    var s3Class = targetTier switch
                    {
                        StorageTier.Hot => S3StorageClass.Standard,
                        StorageTier.Warm => S3StorageClass.StandardInfrequentAccess,
                        StorageTier.Cold => S3StorageClass.Glacier,
                        StorageTier.Archive => S3StorageClass.DeepArchive,
                        _ => throw new ArgumentException($"Unsupported tier {targetTier}", nameof(targetTier))
                    };

                    var copyRequest = new CopyObjectRequest
                    {
                        SourceBucket = bucketName,
                        SourceKey = objectKey,
                        DestinationBucket = bucketName,
                        DestinationKey = objectKey,
                        StorageClass = s3Class,
                        MetadataDirective = S3MetadataDirective.COPY
                    };

                    await _s3Client.CopyObjectAsync(copyRequest, ct);
                }
                else
                {
                    _logger.LogWarning("Provider {Provider} does not support native storage tiering. Simulating transition.", providerName);
                }

                _logger.LogInformation("Transitioned {ObjectKey} successfully to {Tier} on {Provider}", objectKey, targetTier, providerName);
                return new TierTransitionResult(true, objectKey, fromTier, targetTier);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to transition {ObjectKey} to {Tier} on {Provider}", objectKey, targetTier, providerName);
                return new TierTransitionResult(false, objectKey, StorageTier.Hot, targetTier, ex.Message);
            }
        }

        public async Task<StorageTier> GetCurrentTierAsync(string providerName, string objectKey, CancellationToken ct = default)
        {
            var provider = providerName.ToLowerInvariant();
            try
            {
                if (provider == "azure" && _blobServiceClient != null)
                {
                    var containerName = _configuration["StorageProvider:Azure:ContainerName"] ?? "cloudstorage-chunks";
                    var client = _blobServiceClient.GetBlobContainerClient(containerName).GetBlobClient(objectKey);
                    var props = await client.GetPropertiesAsync(cancellationToken: ct);
                    return MapAzureTier(props.Value.AccessTier);
                }
                else if (provider == "s3" && _s3Client != null)
                {
                    var bucketName = _configuration["StorageProvider:S3:BucketName"] ?? "cloudstorage-chunks";
                    var metadata = await _s3Client.GetObjectMetadataAsync(bucketName, objectKey, ct);
                    return MapS3StorageClass(metadata.StorageClass);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch actual storage tier for {ObjectKey} on {Provider}. Defaulting to Hot.", objectKey, providerName);
            }

            return StorageTier.Hot;
        }

        public async Task RestoreFromArchiveAsync(string providerName, string objectKey, CancellationToken ct = default)
        {
            var provider = providerName.ToLowerInvariant();
            _logger.LogInformation("Requesting restore of {ObjectKey} from Archive on {Provider}", objectKey, providerName);

            if (provider == "azure" && _blobServiceClient != null)
            {
                var containerName = _configuration["StorageProvider:Azure:ContainerName"] ?? "cloudstorage-chunks";
                var client = _blobServiceClient.GetBlobContainerClient(containerName).GetBlobClient(objectKey);
                // Transitioning out of archive back to Hot
                await client.SetAccessTierAsync(AccessTier.Hot, cancellationToken: ct);
            }
            else if (provider == "s3" && _s3Client != null)
            {
                var bucketName = _configuration["StorageProvider:S3:BucketName"] ?? "cloudstorage-chunks";
                var restoreRequest = new RestoreObjectRequest
                {
                    BucketName = bucketName,
                    Key = objectKey,
                    Days = 7
                };
                await _s3Client.RestoreObjectAsync(restoreRequest, ct);
            }
            else
            {
                _logger.LogWarning("Provider {Provider} does not support archive restore operations.", providerName);
            }
        }

        private StorageTier MapAzureTier(string accessTier)
        {
            return accessTier.ToLowerInvariant() switch
            {
                "hot" => StorageTier.Hot,
                "cool" => StorageTier.Warm,
                "cold" => StorageTier.Cold,
                "archive" => StorageTier.Archive,
                _ => StorageTier.Hot
            };
        }

        private StorageTier MapS3StorageClass(S3StorageClass storageClass)
        {
            if (storageClass == S3StorageClass.Glacier) return StorageTier.Cold;
            if (storageClass == S3StorageClass.DeepArchive) return StorageTier.Archive;
            return StorageTier.Hot;
        }
    }
}
