using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Durability;

namespace CloudStorage.Infrastructure.Durability
{
    public class DurabilityScoreService : IDurabilityScoreService
    {
        // Simulated health states of replica/shard endpoints
        // Key: "{tenantId}:{objectKey}" -> list of true/false representing health of each shard/replica
        public static ConcurrentDictionary<string, List<bool>> ObjectReplicaHealth { get; } = new();
        public static ConcurrentDictionary<string, List<bool>> ObjectShardHealth { get; } = new();
        public static ConcurrentDictionary<string, string> ObjectStrategy { get; } = new();

        public Task<DurabilityReport> AssessObjectDurabilityAsync(string objectKey, string tenantId)
        {
            var key = $"{tenantId}:{objectKey}";
            var strategy = ObjectStrategy.TryGetValue(key, out var strat) ? strat : "Replication";

            if (strategy == "ErasureCoding")
            {
                var shardHealth = ObjectShardHealth.GetOrAdd(key, _ => new List<bool> { true, true, true, true, true, true }); // default 4+2
                int total = shardHealth.Count;
                int healthy = shardHealth.Count(h => h);
                double score = total > 0 ? (double)healthy / total : 1.0;

                // Needs repair if healthy shards are less than total, or if we are close to failing recovery (e.g. data shards required = 4)
                bool needsRepair = healthy < total;

                return Task.FromResult(new DurabilityReport(
                    ObjectKey: objectKey,
                    DurabilityScore: score,
                    HealthyReplicas: 0,
                    TotalReplicas: 0,
                    HealthyShards: healthy,
                    TotalShards: total,
                    Strategy: strategy,
                    NeedsRepair: needsRepair
                ));
            }
            else
            {
                var replicaHealth = ObjectReplicaHealth.GetOrAdd(key, _ => new List<bool> { true, true, true }); // default 3 replicas
                int total = replicaHealth.Count;
                int healthy = replicaHealth.Count(h => h);
                double score = total > 0 ? (double)healthy / total : 1.0;

                bool needsRepair = healthy < total;

                return Task.FromResult(new DurabilityReport(
                    ObjectKey: objectKey,
                    DurabilityScore: score,
                    HealthyReplicas: healthy,
                    TotalReplicas: total,
                    HealthyShards: 0,
                    TotalShards: 0,
                    Strategy: strategy,
                    NeedsRepair: needsRepair
                ));
            }
        }

        public async Task<IReadOnlyList<DurabilityReport>> GetDegradedObjectsAsync(string tenantId, double threshold = 0.99)
        {
            var degraded = new List<DurabilityReport>();
            var keys = ObjectStrategy.Keys.Where(k => k.StartsWith($"{tenantId}:")).ToList();

            foreach (var key in keys)
            {
                var objectKey = key.Split(':', 2)[1];
                var report = await AssessObjectDurabilityAsync(objectKey, tenantId);
                if (report.DurabilityScore < threshold || report.NeedsRepair)
                {
                    degraded.Add(report);
                }
            }

            return degraded;
        }
    }
}
