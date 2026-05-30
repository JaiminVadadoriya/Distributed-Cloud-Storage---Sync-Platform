using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Metadata;

namespace CloudStorage.Infrastructure.Metadata
{
    public class MetadataShardRouter : IMetadataShardRouter
    {
        private readonly IMetadataPartitionManager _partitionManager;
        
        // Simulating shard databases per physical node
        public static ConcurrentDictionary<string, ConcurrentDictionary<string, ObjectMetadata>> Shards { get; } = new();

        public MetadataShardRouter(IMetadataPartitionManager partitionManager)
        {
            _partitionManager = partitionManager;
        }

        public string ComputePartitionKey(string objectKey, string tenantId)
        {
            return $"{tenantId}:{objectKey}";
        }

        public Task<ObjectMetadata?> RouteGetAsync(string objectKey, string tenantId)
        {
            var partitionKey = ComputePartitionKey(objectKey, tenantId);
            var partition = _partitionManager.GetPartition(partitionKey);
            
            var nodeStore = Shards.GetOrAdd(partition.NodeId, _ => new ConcurrentDictionary<string, ObjectMetadata>());
            
            if (nodeStore.TryGetValue(partitionKey, out var metadata))
            {
                return Task.FromResult<ObjectMetadata?>(metadata);
            }
            
            return Task.FromResult<ObjectMetadata?>(null);
        }

        public Task RouteSetAsync(ObjectMetadata metadata)
        {
            var partitionKey = ComputePartitionKey(metadata.Key, metadata.TenantId);
            var partition = _partitionManager.GetPartition(partitionKey);
            
            var nodeStore = Shards.GetOrAdd(partition.NodeId, _ => new ConcurrentDictionary<string, ObjectMetadata>());
            nodeStore[partitionKey] = metadata;
            
            return Task.CompletedTask;
        }

        public Task RouteDeleteAsync(string objectKey, string tenantId)
        {
            var partitionKey = ComputePartitionKey(objectKey, tenantId);
            var partition = _partitionManager.GetPartition(partitionKey);
            
            var nodeStore = Shards.GetOrAdd(partition.NodeId, _ => new ConcurrentDictionary<string, ObjectMetadata>());
            nodeStore.TryRemove(partitionKey, out _);
            
            return Task.CompletedTask;
        }
    }
}
