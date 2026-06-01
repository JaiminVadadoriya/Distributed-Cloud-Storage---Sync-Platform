using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Search
{
    public record SearchResultItem(string Key, string TenantId, double Score, Dictionary<string, string> Metadata);

    public interface ISearchService
    {
        Task<List<SearchResultItem>> SearchAsync(string query, string tenantId, int limit = 50);
        Task<List<SearchResultItem>> SemanticSearchAsync(float[] queryVector, string tenantId, int limit = 50);
    }
}
