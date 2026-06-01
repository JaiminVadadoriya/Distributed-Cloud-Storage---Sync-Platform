using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Routing
{
    public interface IStorageRoutingEngine
    {
        Task<RoutingDecision> ResolveProviderAsync(string operation, CancellationToken ct = default);
    }
}
