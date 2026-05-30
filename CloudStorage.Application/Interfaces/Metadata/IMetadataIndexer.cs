using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Metadata
{
    public interface IMetadataIndexer
    {
        Task IndexAsync(ObjectMetadata metadata);
        Task DeindexAsync(string key, string tenantId);
    }
}
