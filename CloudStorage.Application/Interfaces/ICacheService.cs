using System;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces
{
    public interface ICacheService
    {
        Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
        Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpireTime = null, TimeSpan? unusedExpireTime = null, CancellationToken ct = default);
        Task RemoveAsync(string key, CancellationToken ct = default);
        Task RemoveByPrefixAsync(string prefixKey, CancellationToken ct = default);
    }
}
