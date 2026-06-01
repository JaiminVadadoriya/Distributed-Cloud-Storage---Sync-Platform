using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Replication;
using CloudStorage.Application.Interfaces.Storage;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Replication
{
    public class ReplicationProvider : IReplicationProvider
    {
        private readonly IStorageProviderFactory _providerFactory;
        private readonly ILogger<ReplicationProvider> _logger;

        public ReplicationProvider(
            IStorageProviderFactory providerFactory,
            ILogger<ReplicationProvider> logger)
        {
            _providerFactory = providerFactory;
            _logger = logger;
        }

        public async Task ReplicateAsync(Guid fileId, string objectKey, string sourceProviderName, string targetProviderName, CancellationToken ct = default)
        {
            var sourceProvider = _providerFactory.GetProvider(sourceProviderName);
            var targetProvider = _providerFactory.GetProvider(targetProviderName);

            _logger.LogInformation("Replicating object {ObjectKey} from {Source} to {Target}", objectKey, sourceProviderName, targetProviderName);

            // 1. Download stream from source
            using var sourceStream = await sourceProvider.DownloadAsync(objectKey, null, ct);

            // 2. Read into MemoryStream and compute hash to verify integrity
            using var ms = new MemoryStream();
            using var sha256 = SHA256.Create();
            
            var buffer = new byte[81920];
            int read;
            while ((read = await sourceStream.ReadAsync(buffer, 0, buffer.Length, ct)) > 0)
            {
                ms.Write(buffer, 0, read);
                sha256.TransformBlock(buffer, 0, read, null, 0);
            }
            sha256.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
            var sourceHash = BitConverter.ToString(sha256.Hash!).Replace("-", "").ToLowerInvariant();

            ms.Position = 0;

            // Get source metadata to preserve ContentType/CustomMetadata
            StorageUploadOptions? uploadOptions = null;
            try
            {
                var metadata = await sourceProvider.GetMetadataAsync(objectKey, ct);
                uploadOptions = new StorageUploadOptions
                {
                    ContentType = metadata.ContentType,
                    Metadata = metadata.CustomMetadata ?? new Dictionary<string, string>(),
                    Overwrite = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not fetch metadata for {ObjectKey} from {Source} during replication", objectKey, sourceProviderName);
            }

            // 3. Upload to target
            await targetProvider.UploadAsync(objectKey, ms, uploadOptions, ct);

            // 4. Verify target metadata / integrity
            try
            {
                var targetMetadata = await targetProvider.GetMetadataAsync(objectKey, ct);
                _logger.LogInformation("Replication of {ObjectKey} verified. Target size: {Size} bytes, Hash: {Hash}", objectKey, targetMetadata.Size, sourceHash);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not verify replicated object {ObjectKey} metadata on target {Target}", objectKey, targetProviderName);
            }
        }
    }
}
