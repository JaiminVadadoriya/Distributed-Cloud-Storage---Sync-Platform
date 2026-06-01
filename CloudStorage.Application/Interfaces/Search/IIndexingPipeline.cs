using System.IO;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Search
{
    public interface IIndexingPipeline
    {
        Task ProcessDocumentAsync(string key, string tenantId, Stream contentStream);
    }
}
