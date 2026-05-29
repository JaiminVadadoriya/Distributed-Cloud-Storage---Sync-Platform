using System;
using System.Collections.Generic;
using CloudStorage.Application.Interfaces.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CloudStorage.Infrastructure.Providers
{
    public class StorageProviderFactory : IStorageProviderFactory
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;

        public StorageProviderFactory(IServiceProvider serviceProvider, IConfiguration configuration)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
        }

        public IObjectStorageProvider GetProvider(string? providerName = null)
        {
            var name = providerName ?? _configuration["StorageProvider:Active"] ?? "Local";
            return _serviceProvider.GetRequiredKeyedService<IObjectStorageProvider>(name);
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
    }
}
