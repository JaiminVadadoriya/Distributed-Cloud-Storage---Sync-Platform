using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CloudStorage.Infrastructure.Providers
{
    public class StorageProviderFactory : IStorageProviderFactory
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly IStorageRoutingEngine _routingEngine;

        public StorageProviderFactory(
            IServiceProvider serviceProvider, 
            IConfiguration configuration,
            IStorageRoutingEngine routingEngine)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _routingEngine = routingEngine;
        }

        public IObjectStorageProvider GetProvider(string? providerName = null)
        {
            var name = providerName ?? _configuration["StorageProvider:Active"] ?? "Local";
            var provider = _serviceProvider.GetRequiredKeyedService<IObjectStorageProvider>(name);
            return new InstrumentedObjectStorageProvider(provider);
        }

        public IChunkStorageProvider GetChunkProvider(string? providerName = null)
        {
            var name = providerName ?? _configuration["StorageProvider:Active"] ?? "Local";
            return _serviceProvider.GetRequiredKeyedService<IChunkStorageProvider>(name);
        }

        public IEnumerable<string> GetAvailableProviders()
        {
            return new[] { "Local", "Azure", "S3", "MinIO", "GCP" };
        }

        public async Task<IObjectStorageProvider> GetProviderWithFallbackAsync(string? providerName = null, CancellationToken ct = default)
        {
            if (providerName != null)
            {
                return GetProvider(providerName);
            }

            var decision = await _routingEngine.ResolveProviderAsync("any", ct);
            return GetProvider(decision.SelectedProvider);
        }
    }
}
