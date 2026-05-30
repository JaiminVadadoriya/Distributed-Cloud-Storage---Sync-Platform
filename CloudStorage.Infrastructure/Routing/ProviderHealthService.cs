using System;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Routing;

namespace CloudStorage.Infrastructure.Routing
{
    public class ProviderHealthService : IProviderHealthService
    {
        private readonly ICacheService _cache;

        public ProviderHealthService(ICacheService cache)
        {
            _cache = cache;
        }

        public async Task<ProviderHealthScore> GetHealthScoreAsync(string providerName, CancellationToken ct = default)
        {
            var isCircuitOpen = await IsCircuitOpenAsync(providerName, ct);
            var latencyKey = $"provider:health:latency:{providerName}";
            var avgLatency = await _cache.GetAsync<double?>(latencyKey, ct) ?? 100.0;

            double score = 1.0;
            if (isCircuitOpen)
            {
                score = 0.0;
            }
            else
            {
                if (avgLatency > 1000.0) score = 0.1;
                else if (avgLatency > 500.0) score = 0.5;
                else if (avgLatency > 200.0) score = 0.8;
            }

            var state = score switch
            {
                >= 0.8 => HealthState.Healthy,
                >= 0.4 => HealthState.Degraded,
                _ => HealthState.Unhealthy
            };

            return new ProviderHealthScore(providerName, state, score, avgLatency, isCircuitOpen);
        }

        public async Task RecordLatencyAsync(string providerName, double latencyMs, CancellationToken ct = default)
        {
            var latencyKey = $"provider:health:latency:{providerName}";
            var currentAvg = await _cache.GetAsync<double?>(latencyKey, ct) ?? latencyMs;

            var nextAvg = (currentAvg * 0.7) + (latencyMs * 0.3);
            await _cache.SetAsync(latencyKey, (double?)nextAvg, TimeSpan.FromHours(24), ct: ct);
        }

        public async Task<bool> IsCircuitOpenAsync(string providerName, CancellationToken ct = default)
        {
            var circuitKey = $"provider:health:circuit:{providerName}";
            return await _cache.GetAsync<bool?>(circuitKey, ct) ?? false;
        }

        public async Task SetCircuitOpenAsync(string providerName, bool isOpen, CancellationToken ct = default)
        {
            var circuitKey = $"provider:health:circuit:{providerName}";
            await _cache.SetAsync(circuitKey, (bool?)isOpen, TimeSpan.FromMinutes(5), ct: ct);
        }
    }
}
