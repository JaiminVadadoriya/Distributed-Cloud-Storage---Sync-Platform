using System;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Consensus;
using StackExchange.Redis;

namespace CloudStorage.Infrastructure.Consensus
{
    public class LeaderElectionService : ILeaderElectionService
    {
        private readonly IConnectionMultiplexer? _redis;
        private static string? _inMemoryLeader;
        private static DateTime _inMemoryExpiry = DateTime.MinValue;
        private static readonly object _lock = new();

        public LeaderElectionService(IConnectionMultiplexer? redis = null)
        {
            _redis = redis;
        }

        public async Task<bool> TryAcquireLeadershipAsync(string nodeId)
        {
            if (_redis == null)
            {
                lock (_lock)
                {
                    if (_inMemoryLeader == null || DateTime.UtcNow > _inMemoryExpiry || _inMemoryLeader == nodeId)
                    {
                        _inMemoryLeader = nodeId;
                        _inMemoryExpiry = DateTime.UtcNow.AddSeconds(10);
                        return true;
                    }
                    return false;
                }
            }

            try
            {
                var db = _redis.GetDatabase();
                var leaderKey = "cluster:leader";
                
                var currentLeader = await db.StringGetAsync(leaderKey);
                if (currentLeader.HasValue)
                {
                    if (currentLeader.ToString() == nodeId)
                    {
                        // Renew lease
                        return await db.KeyExpireAsync(leaderKey, TimeSpan.FromSeconds(10));
                    }
                    return false;
                }

                // Try to acquire lease
                return await db.StringSetAsync(leaderKey, nodeId, TimeSpan.FromSeconds(10), When.NotExists);
            }
            catch
            {
                // Fallback to in-memory on redis connection failure
                lock (_lock)
                {
                    if (_inMemoryLeader == null || DateTime.UtcNow > _inMemoryExpiry || _inMemoryLeader == nodeId)
                    {
                        _inMemoryLeader = nodeId;
                        _inMemoryExpiry = DateTime.UtcNow.AddSeconds(10);
                        return true;
                    }
                    return false;
                }
            }
        }

        public async Task ReleaseLeadershipAsync(string nodeId)
        {
            if (_redis == null)
            {
                lock (_lock)
                {
                    if (_inMemoryLeader == nodeId)
                    {
                        _inMemoryLeader = null;
                        _inMemoryExpiry = DateTime.MinValue;
                    }
                }
                return;
            }

            try
            {
                var db = _redis.GetDatabase();
                var leaderKey = "cluster:leader";
                
                var releaseScript = @"
                    if redis.call('get', KEYS[1]) == ARGV[1] then
                        return redis.call('del', KEYS[1])
                    else
                        return 0
                    end";

                await db.ScriptEvaluateAsync(releaseScript, new RedisKey[] { leaderKey }, new RedisValue[] { nodeId });
            }
            catch
            {
                lock (_lock)
                {
                    if (_inMemoryLeader == nodeId)
                    {
                        _inMemoryLeader = null;
                        _inMemoryExpiry = DateTime.MinValue;
                    }
                }
            }
        }

        public async Task<string?> GetCurrentLeaderAsync()
        {
            if (_redis == null)
            {
                lock (_lock)
                {
                    if (_inMemoryLeader != null && DateTime.UtcNow <= _inMemoryExpiry)
                    {
                        return _inMemoryLeader;
                    }
                    return null;
                }
            }

            try
            {
                var db = _redis.GetDatabase();
                var leaderVal = await db.StringGetAsync("cluster:leader");
                if (leaderVal.HasValue)
                {
                    return leaderVal.ToString();
                }
                return null;
            }
            catch
            {
                lock (_lock)
                {
                    if (_inMemoryLeader != null && DateTime.UtcNow <= _inMemoryExpiry)
                    {
                        return _inMemoryLeader;
                    }
                    return null;
                }
            }
        }
    }
}
