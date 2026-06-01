using System;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Metadata;

namespace CloudStorage.Infrastructure.Metadata
{
    public class MetadataService : IMetadataService
    {
        private readonly IMetadataRepository _repository;
        private readonly ICacheService _cache;
        private readonly IMetadataIndexer _indexer;

        public MetadataService(IMetadataRepository repository, ICacheService cache, IMetadataIndexer indexer)
        {
            _repository = repository;
            _cache = cache;
            _indexer = indexer;
        }

        private string GetCacheKey(string key, string tenantId) => $"metadata:{tenantId}:{key}";

        public async Task CreateObjectAsync(ObjectMetadata metadata)
        {
            if (metadata == null) throw new ArgumentNullException(nameof(metadata));

            await _repository.SaveAsync(metadata);

            var cacheKey = GetCacheKey(metadata.Key, metadata.TenantId);
            await _cache.SetAsync(cacheKey, metadata, TimeSpan.FromMinutes(15));

            await _indexer.IndexAsync(metadata);
        }

        public async Task<ObjectMetadata?> GetObjectAsync(string key, string tenantId)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentException("Key cannot be null or empty", nameof(key));

            var cacheKey = GetCacheKey(key, tenantId);
            var cached = await _cache.GetAsync<ObjectMetadata>(cacheKey);
            if (cached != null)
            {
                return cached;
            }

            var dbMetadata = await _repository.FindByKeyAsync(key, tenantId);
            if (dbMetadata != null)
            {
                await _cache.SetAsync(cacheKey, dbMetadata, TimeSpan.FromMinutes(15));
            }

            return dbMetadata;
        }

        public async Task UpdateObjectTierAsync(string key, string tier, string tenantId)
        {
            var metadata = await GetObjectAsync(key, tenantId);
            if (metadata == null)
            {
                return;
            }

            var updated = new ObjectMetadata(
                metadata.ObjectId,
                metadata.Key,
                metadata.Size,
                metadata.RootHash,
                metadata.ChunkHashes,
                metadata.TenantId,
                tier,
                metadata.Tags,
                DateTime.UtcNow
            );

            await _repository.SaveAsync(updated);

            var cacheKey = GetCacheKey(key, tenantId);
            await _cache.SetAsync(cacheKey, updated, TimeSpan.FromMinutes(15));

            await _indexer.IndexAsync(updated);
        }

        public async Task DeleteObjectAsync(string key, string tenantId)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentException("Key cannot be null or empty", nameof(key));

            await _repository.RemoveAsync(key, tenantId);

            var cacheKey = GetCacheKey(key, tenantId);
            await _cache.RemoveAsync(cacheKey);

            await _indexer.DeindexAsync(key, tenantId);
        }
    }
}
