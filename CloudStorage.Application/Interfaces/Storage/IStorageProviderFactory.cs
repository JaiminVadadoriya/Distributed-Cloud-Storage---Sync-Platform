using System.Collections.Generic;

namespace CloudStorage.Application.Interfaces.Storage
{
    public interface IStorageProviderFactory
    {
        IObjectStorageProvider GetProvider(string? providerName = null);
        IChunkStorageProvider GetChunkProvider(string? providerName = null);
        IEnumerable<string> GetAvailableProviders();
    }
}
