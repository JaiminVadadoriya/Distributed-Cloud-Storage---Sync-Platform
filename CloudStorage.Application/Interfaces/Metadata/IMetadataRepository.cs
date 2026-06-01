using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Metadata
{
    public interface IMetadataRepository
    {
        Task SaveAsync(ObjectMetadata metadata);
        Task<ObjectMetadata?> FindByKeyAsync(string key, string tenantId);
        Task RemoveAsync(string key, string tenantId);
    }
}
