using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Durability;

namespace CloudStorage.Infrastructure.Durability
{
    public class AutomatedRepairService : IAutomatedRepairService
    {
        private readonly IDurabilityScoreService _durabilityService;
        private readonly IErasureCodingEngine _erasureCodingEngine;

        public AutomatedRepairService(
            IDurabilityScoreService durabilityService,
            IErasureCodingEngine erasureCodingEngine)
        {
            _durabilityService = durabilityService;
            _erasureCodingEngine = erasureCodingEngine;
        }

        public async Task<RepairResult> RepairObjectAsync(string objectKey, string tenantId)
        {
            var sw = Stopwatch.StartNew();
            var report = await _durabilityService.AssessObjectDurabilityAsync(objectKey, tenantId);

            if (!report.NeedsRepair)
            {
                return new RepairResult(objectKey, true, 0, sw.Elapsed, report.Strategy);
            }

            var key = $"{tenantId}:{objectKey}";
            int shardsReconstructed = 0;

            if (report.Strategy == "ErasureCoding")
            {
                if (DurabilityScoreService.ObjectShardHealth.TryGetValue(key, out var shardHealth))
                {
                    int total = shardHealth.Count;
                    int healthy = shardHealth.Count(h => h);
                    int missing = total - healthy;

                    // Data shards is total - parity shards (assuming 2 parity shards out of 6 total shards, so 4 data shards)
                    int dataShards = Math.Max(1, total - 2); 
                    var config = new ErasureCodingConfig(dataShards, 2);

                    if (_erasureCodingEngine.CanRecover(healthy, config))
                    {
                        // Simulate reconstruction
                        for (int i = 0; i < shardHealth.Count; i++)
                        {
                            if (!shardHealth[i])
                            {
                                shardHealth[i] = true;
                                shardsReconstructed++;
                            }
                        }
                        sw.Stop();
                        return new RepairResult(objectKey, true, shardsReconstructed, sw.Elapsed, report.Strategy);
                    }
                }
            }
            else
            {
                // Replication strategy
                if (DurabilityScoreService.ObjectReplicaHealth.TryGetValue(key, out var replicaHealth))
                {
                    int total = replicaHealth.Count;
                    int healthy = replicaHealth.Count(h => h);
                    int missing = total - healthy;

                    // Reconstruct/re-replicate replicas
                    for (int i = 0; i < replicaHealth.Count; i++)
                    {
                        if (!replicaHealth[i])
                        {
                            replicaHealth[i] = true;
                            shardsReconstructed++;
                        }
                    }
                    sw.Stop();
                    return new RepairResult(objectKey, true, shardsReconstructed, sw.Elapsed, report.Strategy);
                }
            }

            sw.Stop();
            return new RepairResult(objectKey, false, 0, sw.Elapsed, report.Strategy);
        }

        public async Task<IReadOnlyList<RepairResult>> RunRepairScanAsync(string tenantId, int maxObjects = 1000)
        {
            var results = new List<RepairResult>();
            var degraded = await _durabilityService.GetDegradedObjectsAsync(tenantId);

            foreach (var report in degraded.Take(maxObjects))
            {
                var result = await RepairObjectAsync(report.ObjectKey, tenantId);
                results.Add(result);
            }

            return results;
        }
    }
}
