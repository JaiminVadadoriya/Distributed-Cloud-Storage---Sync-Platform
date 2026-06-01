using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers
{
    public class BaseChunkStorageProvider : IChunkStorageProvider
    {
        protected readonly IObjectStorageProvider _objectProvider;

        public BaseChunkStorageProvider(IObjectStorageProvider objectProvider)
        {
            _objectProvider = objectProvider;
        }

        protected virtual string GetChunkKey(Guid fileId, int chunkIndex)
        {
            return $"{fileId}/{chunkIndex}.chunk";
        }

        public virtual async Task<string> SaveChunkAsync(Guid fileId, int chunkIndex, Stream data, CancellationToken ct = default)
        {
            var key = GetChunkKey(fileId, chunkIndex);
            var result = await _objectProvider.UploadAsync(key, data, new StorageUploadOptions { Overwrite = true }, ct);
            return result.StoragePath;
        }

        public virtual async Task<Stream> GetChunkAsync(string storagePath, CancellationToken ct = default)
        {
            var (_, cleanKey) = StoragePathResolver.Resolve(storagePath, _objectProvider.ProviderName);
            return await _objectProvider.DownloadAsync(cleanKey, null, ct);
        }

        public virtual async Task DeleteChunkAsync(string storagePath, CancellationToken ct = default)
        {
            var (_, cleanKey) = StoragePathResolver.Resolve(storagePath, _objectProvider.ProviderName);
            await _objectProvider.DeleteAsync(cleanKey, ct);
        }

        public virtual async Task<bool> ChunkExistsAsync(string objectKey, CancellationToken ct = default)
        {
            return await _objectProvider.ExistsAsync(objectKey, ct);
        }

        public virtual async Task<PresignedUrlResult> GenerateChunkUploadUrlAsync(Guid fileId, int chunkIndex, TimeSpan expiry, CancellationToken ct = default)
        {
            var key = GetChunkKey(fileId, chunkIndex);
            return await _objectProvider.GeneratePresignedUploadUrlAsync(key, expiry, ct);
        }

        public virtual async Task<PresignedUrlResult> GenerateChunkDownloadUrlAsync(string storagePath, string? fileName = null, CancellationToken ct = default)
        {
            var (_, cleanKey) = StoragePathResolver.Resolve(storagePath, _objectProvider.ProviderName);
            return await _objectProvider.GeneratePresignedDownloadUrlAsync(cleanKey, fileName, null, ct);
        }
    }
}
