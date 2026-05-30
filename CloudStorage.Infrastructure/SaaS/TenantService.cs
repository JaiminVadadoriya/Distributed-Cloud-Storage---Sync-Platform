using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.SaaS;

namespace CloudStorage.Infrastructure.SaaS
{
    public class TenantService : ITenantService
    {
        private static readonly ConcurrentDictionary<string, TenantConfig> Tenants = new();
        private static readonly ConcurrentDictionary<string, long> TenantStorageUsage = new();

        public Task CreateTenantAsync(TenantConfig config)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));
            Tenants[config.TenantId] = config;
            return Task.CompletedTask;
        }

        public Task<TenantConfig?> GetTenantConfigAsync(string tenantId)
        {
            if (Tenants.TryGetValue(tenantId, out var config))
            {
                return Task.FromResult<TenantConfig?>(config);
            }
            return Task.FromResult<TenantConfig?>(null);
        }

        public Task<bool> ValidateQuotaAsync(string tenantId, long additionalBytes)
        {
            if (!Tenants.TryGetValue(tenantId, out var config))
            {
                // Default fallback: allow if not registered
                return Task.FromResult(true);
            }

            var currentUsage = TenantStorageUsage.GetOrAdd(tenantId, 0);
            if (currentUsage + additionalBytes > config.StorageQuotaBytes)
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(true);
        }

        public static void RecordUsage(string tenantId, long bytes)
        {
            TenantStorageUsage.AddOrUpdate(tenantId, bytes, (_, current) => current + bytes);
        }
    }
}
