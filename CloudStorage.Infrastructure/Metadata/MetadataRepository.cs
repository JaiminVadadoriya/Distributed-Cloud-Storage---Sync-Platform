using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Metadata;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.Metadata
{
    public class MetadataRepository : IMetadataRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public MetadataRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task SaveAsync(ObjectMetadata metadata)
        {
            if (metadata == null) throw new ArgumentNullException(nameof(metadata));

            var dbEntity = await _dbContext.ObjectMetadata
                .FirstOrDefaultAsync(m => m.Key == metadata.Key && m.TenantId == metadata.TenantId);

            bool isNew = dbEntity == null;
            if (isNew)
            {
                dbEntity = new DbObjectMetadata
                {
                    Key = metadata.Key,
                    TenantId = metadata.TenantId
                };
            }

            dbEntity!.ObjectId = metadata.ObjectId;
            dbEntity.Size = metadata.Size;
            dbEntity.RootHash = metadata.RootHash;
            dbEntity.ChunkHashesJson = JsonSerializer.Serialize(metadata.ChunkHashes ?? new List<string>());
            dbEntity.CurrentTier = metadata.CurrentTier;
            dbEntity.TagsJson = JsonSerializer.Serialize(metadata.Tags ?? new Dictionary<string, string>());
            dbEntity.LastModified = metadata.LastModified;

            if (isNew)
            {
                await _dbContext.ObjectMetadata.AddAsync(dbEntity);
            }
            else
            {
                _dbContext.ObjectMetadata.Update(dbEntity);
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task<ObjectMetadata?> FindByKeyAsync(string key, string tenantId)
        {
            var dbEntity = await _dbContext.ObjectMetadata
                .FirstOrDefaultAsync(m => m.Key == key && m.TenantId == tenantId);

            if (dbEntity == null) return null;

            var chunkHashes = JsonSerializer.Deserialize<List<string>>(dbEntity.ChunkHashesJson) ?? new List<string>();
            var tags = JsonSerializer.Deserialize<Dictionary<string, string>>(dbEntity.TagsJson) ?? new Dictionary<string, string>();

            return new ObjectMetadata(
                dbEntity.ObjectId,
                dbEntity.Key,
                dbEntity.Size,
                dbEntity.RootHash,
                chunkHashes,
                dbEntity.TenantId,
                dbEntity.CurrentTier,
                tags,
                dbEntity.LastModified
            );
        }

        public async Task RemoveAsync(string key, string tenantId)
        {
            var dbEntity = await _dbContext.ObjectMetadata
                .FirstOrDefaultAsync(m => m.Key == key && m.TenantId == tenantId);

            if (dbEntity != null)
            {
                _dbContext.ObjectMetadata.Remove(dbEntity);
                await _dbContext.SaveChangesAsync();
            }
        }
    }
}
