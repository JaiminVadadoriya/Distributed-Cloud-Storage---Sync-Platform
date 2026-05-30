using System;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Routing
{
    public class StorageRoutingEngine : IStorageRoutingEngine
    {
        private readonly IProviderHealthService _healthService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<StorageRoutingEngine> _logger;

        public StorageRoutingEngine(
            IProviderHealthService healthService,
            IConfiguration configuration,
            ILogger<StorageRoutingEngine> logger)
        {
            _healthService = healthService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<RoutingDecision> ResolveProviderAsync(string operation, CancellationToken ct = default)
        {
            var primary = _configuration["StorageProvider:Active"] ?? "MinIO";
            var primaryHealth = await _healthService.GetHealthScoreAsync(primary, ct);

            if (!primaryHealth.IsCircuitOpen && primaryHealth.State != HealthState.Unhealthy)
            {
                return new RoutingDecision(primary, "Active", "Primary provider is healthy.");
            }

            var fallbacks = new[] { "MinIO", "S3", "Azure", "Local" };
            foreach (var fallback in fallbacks)
            {
                if (string.Equals(fallback, primary, StringComparison.OrdinalIgnoreCase)) continue;

                var health = await _healthService.GetHealthScoreAsync(fallback, ct);
                if (!health.IsCircuitOpen && health.State != HealthState.Unhealthy)
                {
                    _logger.LogWarning("Primary provider {Primary} is unhealthy. Routing to fallback provider {Fallback}.", primary, fallback);
                    return new RoutingDecision(fallback, "Failover", $"Primary {primary} circuit is open/unhealthy. Selected healthy fallback.");
                }
            }

            _logger.LogError("All storage providers are unhealthy/circuits open! Defaulting to primary {Primary}.", primary);
            return new RoutingDecision(primary, "FallbackDefault", "All providers degraded. Falling back to default active provider.");
        }
    }
}
