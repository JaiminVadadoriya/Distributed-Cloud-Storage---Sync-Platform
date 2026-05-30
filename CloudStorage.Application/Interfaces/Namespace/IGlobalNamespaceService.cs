using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Namespace
{
    public record NamespaceEntry(string GlobalPath, string TenantId, string Provider, string PhysicalKey, 
        string Region, Dictionary<string, string> Aliases);

    public interface IGlobalNamespaceService
    {
        Task<NamespaceEntry> RegisterAsync(string globalPath, string tenantId, string provider, string physicalKey, string region);
        Task<NamespaceEntry?> ResolveAsync(string globalPath);
        Task CreateAliasAsync(string globalPath, string alias);
        Task<IReadOnlyList<NamespaceEntry>> ListAsync(string pathPrefix, string tenantId, int limit = 100);
        Task FederateNamespaceAsync(string sourceCluster, string targetCluster, string pathPrefix);
    }
}
