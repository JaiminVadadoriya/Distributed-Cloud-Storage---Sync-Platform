using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Routing
{
    public interface IFailoverCoordinator
    {
        Task<FailoverState> GetFailoverStateAsync(string primaryProvider, CancellationToken ct = default);
        Task TriggerFailoverAsync(string fromProvider, string toProvider, CancellationToken ct = default);
        Task TriggerFailbackAsync(string primaryProvider, CancellationToken ct = default);
    }
}
