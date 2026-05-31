using System;
using System.Text.Json;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace CloudStorage.Infrastructure.Services
{
    public class RedisCacheService : ICacheService
    {
        private readonly IDistributedCache _cache;
        private readonly IConnectionMultiplexer _redis;

        public RedisCacheService(IDistributedCache cache, IConnectionMultiplexer redis)
        {
            _cache = cache;
            _redis = redis;
        }

        public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
        {
            var cachedResponse = await _cache.GetStringAsync(key, ct);

            if (string.IsNullOrEmpty(cachedResponse))
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(cachedResponse);
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpireTime = null, TimeSpan? unusedExpireTime = null, CancellationToken ct = default)
        {
            var options = new DistributedCacheEntryOptions();

            if (absoluteExpireTime.HasValue)
            {
                options.AbsoluteExpirationRelativeToNow = absoluteExpireTime;
            }

            if (unusedExpireTime.HasValue)
            {
                options.SlidingExpiration = unusedExpireTime;
            }

            // Provide a default 1-hour absolute expiration if none specified
            if (!absoluteExpireTime.HasValue && !unusedExpireTime.HasValue)
            {
                options.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            }

            var serializedResponse = JsonSerializer.Serialize(value);

            await _cache.SetStringAsync(key, serializedResponse, options, ct);
        }

        public async Task RemoveAsync(string key, CancellationToken ct = default)
        {
            await _cache.RemoveAsync(key, ct);
        }

        public async Task RemoveByPrefixAsync(string prefixKey, CancellationToken ct = default)
        {
            var server = _redis.GetServer(_redis.GetEndPoints()[0]);
            await foreach (var key in server.KeysAsync(pattern: $"{prefixKey}*").WithCancellation(ct))
            {
                await _cache.RemoveAsync(key.ToString(), ct);
            }
        }
    }
}
