using System;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Routing
{
    public interface IProviderHealthService
    {
        Task<ProviderHealthScore> GetHealthScoreAsync(string providerName, CancellationToken ct = default);
        Task RecordLatencyAsync(string providerName, double latencyMs, CancellationToken ct = default);
        Task<bool> IsCircuitOpenAsync(string providerName, CancellationToken ct = default);
        Task SetCircuitOpenAsync(string providerName, bool isOpen, CancellationToken ct = default);
    }
}
