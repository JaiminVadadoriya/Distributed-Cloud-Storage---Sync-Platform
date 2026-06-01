using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Metadata;

namespace CloudStorage.Infrastructure.Metadata
{
    public class MetadataRebalancer : IMetadataRebalancer
    {
        private readonly IMetadataPartitionManager _partitionManager;

        public MetadataRebalancer(IMetadataPartitionManager partitionManager)
        {
            _partitionManager = partitionManager;
        }

        public Task<RebalanceResult> RebalanceAsync(string addedNodeId)
        {
            var sw = Stopwatch.StartNew();
            int partitionsMoved = 0;
            int objectsMigrated = 0;

            // Add node to the partition ring
            _partitionManager.AddNode(addedNodeId);

            // Re-evaluate placement of all objects currently in other shards
            foreach (var shardPair in MetadataShardRouter.Shards)
            {
                var sourceNodeId = shardPair.Key;
                if (sourceNodeId == addedNodeId) continue;

                var sourceStore = shardPair.Value;
                var keysToMove = sourceStore.Keys
                    .Where(key => _partitionManager.GetPartition(key).NodeId == addedNodeId)
                    .ToList();

                if (keysToMove.Any())
                {
                    partitionsMoved++;
                    var targetStore = MetadataShardRouter.Shards.GetOrAdd(addedNodeId, _ => new ConcurrentDictionary<string, ObjectMetadata>());

                    foreach (var key in keysToMove)
                    {
                        if (sourceStore.TryRemove(key, out var metadata))
                        {
                            targetStore[key] = metadata;
                            objectsMigrated++;
                        }
                    }
                }
            }

            sw.Stop();
            return Task.FromResult(new RebalanceResult(partitionsMoved, objectsMigrated, sw.Elapsed, true));
        }

        public Task<RebalanceResult> DrainNodeAsync(string removedNodeId)
        {
            var sw = Stopwatch.StartNew();
            int partitionsMoved = 0;
            int objectsMigrated = 0;

            // Remove node from the partition ring FIRST so new lookups go to alternative nodes
            _partitionManager.RemoveNode(removedNodeId);

            if (MetadataShardRouter.Shards.TryRemove(removedNodeId, out var sourceStore))
            {
                var keysToMove = sourceStore.ToList();
                if (keysToMove.Any())
                {
                    partitionsMoved++;
                    foreach (var pair in keysToMove)
                    {
                        var targetNodeId = _partitionManager.GetPartition(pair.Key).NodeId;
                        var targetStore = MetadataShardRouter.Shards.GetOrAdd(targetNodeId, _ => new ConcurrentDictionary<string, ObjectMetadata>());
                        targetStore[pair.Key] = pair.Value;
                        objectsMigrated++;
                    }
                }
            }

            sw.Stop();
            return Task.FromResult(new RebalanceResult(partitionsMoved, objectsMigrated, sw.Elapsed, true));
        }

        public Task<bool> VerifyBalanceAsync(double maxSkewPercentage = 10.0)
        {
            var activeNodes = _partitionManager.GetAllPartitions()
                .Select(p => p.NodeId)
                .Distinct()
                .ToList();

            if (activeNodes.Count <= 1) return Task.FromResult(true);

            // Count partitions per node
            var counts = _partitionManager.GetAllPartitions()
                .GroupBy(p => p.NodeId)
                .Select(g => g.Count())
                .ToList();

            double average = counts.Average();
            double max = counts.Max();
            double min = counts.Min();

            double skewMax = ((max - average) / average) * 100.0;
            double skewMin = ((average - min) / average) * 100.0;

            bool isBalanced = Math.Max(skewMax, skewMin) <= maxSkewPercentage;
            return Task.FromResult(isBalanced);
        }
    }
}
