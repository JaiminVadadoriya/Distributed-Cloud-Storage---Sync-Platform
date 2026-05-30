using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Chaos;
using CloudStorage.Infrastructure.Consensus;

namespace CloudStorage.Infrastructure.Chaos
{
    public class ChaosTestingService : IChaosTestingService
    {
        private static readonly ConcurrentDictionary<string, (double FailureRate, int LatencySpikeMs)> ChaosConfigs = new();
        private static readonly Random Rnd = new();

        public void EnableChaos(string provider, double failureRate, int latencySpikeMs)
        {
            if (string.IsNullOrEmpty(provider)) throw new ArgumentException("Provider cannot be null or empty", nameof(provider));
            
            ChaosConfigs[provider] = (failureRate, latencySpikeMs);

            // If it is a simulated consensus node, partition it if failure rate is high
            if (provider.StartsWith("node-") && failureRate >= 0.5)
            {
                ConsensusService.NodeHealth[provider] = false;
            }
        }

        public void DisableChaos(string provider)
        {
            if (string.IsNullOrEmpty(provider)) throw new ArgumentException("Provider cannot be null or empty", nameof(provider));
            
            ChaosConfigs.TryRemove(provider, out _);

            // Re-enable consensus node health
            if (provider.StartsWith("node-"))
            {
                ConsensusService.NodeHealth[provider] = true;
            }
        }

        public async Task SimulateFaultIfEnabledAsync(string provider)
        {
            if (string.IsNullOrEmpty(provider)) return;

            if (ChaosConfigs.TryGetValue(provider, out var config))
            {
                if (config.LatencySpikeMs > 0)
                {
                    await Task.Delay(config.LatencySpikeMs);
                }

                if (Rnd.NextDouble() < config.FailureRate)
                {
                    throw new InvalidOperationException($"[Chaos Engineering Injection] Injected simulated failure on provider: {provider}");
                }
            }
        }
    }
}
