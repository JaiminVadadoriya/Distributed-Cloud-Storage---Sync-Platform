using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Metadata
{
    public record ObjectMetadata(Guid ObjectId, string Key, long Size, string RootHash, List<string> ChunkHashes, string TenantId, string CurrentTier, Dictionary<string, string> Tags, DateTime LastModified);

    public interface IMetadataService
    {
        Task CreateObjectAsync(ObjectMetadata metadata);
        Task<ObjectMetadata?> GetObjectAsync(string key, string tenantId);
        Task UpdateObjectTierAsync(string key, string tier, string tenantId);
        Task DeleteObjectAsync(string key, string tenantId);
    }
}
