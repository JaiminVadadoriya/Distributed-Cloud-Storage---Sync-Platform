using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Metadata
{
    public interface IMetadataShardRouter
    {
        string ComputePartitionKey(string objectKey, string tenantId);
        Task<ObjectMetadata?> RouteGetAsync(string objectKey, string tenantId);
        Task RouteSetAsync(ObjectMetadata metadata);
        Task RouteDeleteAsync(string objectKey, string tenantId);
    }
}
