using System.Collections.Generic;

namespace CloudStorage.Application.Interfaces.Storage
{
    public interface IStorageProviderFactory
    {
        IObjectStorageProvider GetProvider(string? providerName = null);
        IChunkStorageProvider GetChunkProvider(string? providerName = null);
        IEnumerable<string> GetAvailableProviders();
        System.Threading.Tasks.Task<IObjectStorageProvider> GetProviderWithFallbackAsync(string? providerName = null, System.Threading.CancellationToken ct = default);
    }
}
