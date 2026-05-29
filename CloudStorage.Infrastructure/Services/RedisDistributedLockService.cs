using System;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using StackExchange.Redis;

namespace CloudStorage.Infrastructure.Services
{
    public class RedisDistributedLockService : IDistributedLockService
    {
        private readonly IConnectionMultiplexer _redis;

        public RedisDistributedLockService(IConnectionMultiplexer redis)
        {
            _redis = redis;
        }

        public async Task<IAsyncDisposable?> TryAcquireLockAsync(string resource, TimeSpan expiry, CancellationToken ct = default)
        {
            var db = _redis.GetDatabase();
            var lockKey = $"lock:{resource}";
            var lockValue = Guid.NewGuid().ToString();

            var acquired = await db.StringSetAsync(lockKey, lockValue, expiry, When.NotExists);
            if (acquired)
            {
                return new RedisLock(db, lockKey, lockValue);
            }

            return null;
        }

        private class RedisLock : IAsyncDisposable
        {
            private readonly IDatabase _db;
            private readonly string _lockKey;
            private readonly string _lockValue;
            private int _disposed;

            public RedisLock(IDatabase db, string lockKey, string lockValue)
            {
                _db = db;
                _lockKey = lockKey;
                _lockValue = lockValue;
            }

            public async ValueTask DisposeAsync()
            {
                if (Interlocked.CompareExchange(ref _disposed, 1, 0) == 0)
                {
                    // Release lock using Lua script to guarantee atomicity (only delete if value matches)
                    var releaseScript = @"
                        if redis.call('get', KEYS[1]) == ARGV[1] then
                            return redis.call('del', KEYS[1])
                        else
                            return 0
                        end";

                    await _db.ScriptEvaluateAsync(releaseScript, new RedisKey[] { _lockKey }, new RedisValue[] { _lockValue });
                }
            }
        }
    }
}
