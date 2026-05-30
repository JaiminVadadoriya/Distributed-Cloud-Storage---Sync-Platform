using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Namespace;

namespace CloudStorage.Infrastructure.Namespace
{
    public class GlobalNamespaceService : IGlobalNamespaceService
    {
        private static readonly ConcurrentDictionary<string, NamespaceEntry> NamespaceRegistry = new();
        private static readonly ConcurrentDictionary<string, string> Aliases = new();
        private static readonly ConcurrentDictionary<string, string> FederatedPrefixes = new(); // prefix -> target cluster

        public Task<NamespaceEntry> RegisterAsync(string globalPath, string tenantId, string provider, string physicalKey, string region)
        {
            if (string.IsNullOrEmpty(globalPath)) throw new ArgumentException("Path cannot be empty");

            var entry = new NamespaceEntry(
                GlobalPath: globalPath,
                TenantId: tenantId,
                Provider: provider,
                PhysicalKey: physicalKey,
                Region: region,
                Aliases: new Dictionary<string, string>()
            );

            NamespaceRegistry[globalPath] = entry;
            return Task.FromResult(entry);
        }

        public Task<NamespaceEntry?> ResolveAsync(string globalPath)
        {
            if (string.IsNullOrEmpty(globalPath)) return Task.FromResult<NamespaceEntry?>(null);

            // 1. Try direct resolution
            if (NamespaceRegistry.TryGetValue(globalPath, out var entry))
            {
                return Task.FromResult<NamespaceEntry?>(entry);
            }

            // 2. Try alias resolution
            if (Aliases.TryGetValue(globalPath, out var targetPath))
            {
                if (NamespaceRegistry.TryGetValue(targetPath, out var aliasEntry))
                {
                    return Task.FromResult<NamespaceEntry?>(aliasEntry);
                }
            }

            // 3. Try federated namespace matching
            foreach (var prefixPair in FederatedPrefixes)
            {
                if (globalPath.StartsWith(prefixPair.Key))
                {
                    // Simulated federated resolution
                    var federatedEntry = new NamespaceEntry(
                        GlobalPath: globalPath,
                        TenantId: "federated-tenant",
                        Provider: "MinIO",
                        PhysicalKey: $"federated/{globalPath.TrimStart('/')}",
                        Region: "federated-region",
                        Aliases: new Dictionary<string, string>()
                    );
                    return Task.FromResult<NamespaceEntry?>(federatedEntry);
                }
            }

            return Task.FromResult<NamespaceEntry?>(null);
        }

        public Task CreateAliasAsync(string globalPath, string alias)
        {
            if (string.IsNullOrEmpty(globalPath) || string.IsNullOrEmpty(alias))
                throw new ArgumentException("Path and alias cannot be empty");

            Aliases[alias] = globalPath;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<NamespaceEntry>> ListAsync(string pathPrefix, string tenantId, int limit = 100)
        {
            var results = NamespaceRegistry.Values
                .Where(e => e.TenantId == tenantId && e.GlobalPath.StartsWith(pathPrefix))
                .Take(limit)
                .ToList();

            return Task.FromResult<IReadOnlyList<NamespaceEntry>>(results);
        }

        public Task FederateNamespaceAsync(string sourceCluster, string targetCluster, string pathPrefix)
        {
            if (string.IsNullOrEmpty(pathPrefix)) throw new ArgumentException("Path prefix cannot be empty");

            FederatedPrefixes[pathPrefix] = targetCluster;
            return Task.CompletedTask;
        }
    }
}
