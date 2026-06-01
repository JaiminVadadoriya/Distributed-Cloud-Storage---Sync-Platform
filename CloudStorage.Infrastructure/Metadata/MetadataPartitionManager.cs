using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CloudStorage.Application.Interfaces.Metadata;

namespace CloudStorage.Infrastructure.Metadata
{
    public class MetadataPartitionManager : IMetadataPartitionManager
    {
        private readonly List<PartitionInfo> _ring = new();
        private readonly object _lock = new();

        public void InitializeRing(IReadOnlyList<string> nodeIds, int virtualNodesPerNode = 256)
        {
            lock (_lock)
            {
                _ring.Clear();
                foreach (var nodeId in nodeIds)
                {
                    AddNodeInternal(nodeId, virtualNodesPerNode);
                }
                SortRing();
            }
        }

        public PartitionInfo GetPartition(string partitionKey)
        {
            lock (_lock)
            {
                if (_ring.Count == 0)
                {
                    throw new InvalidOperationException("Hash ring is empty.");
                }

                uint hash = Hash(partitionKey);
                // Find first virtual node with hash >= hash
                var partition = _ring.FirstOrDefault(p => p.HashRangeEnd >= hash);
                
                // Wrap around
                return partition ?? _ring[0];
            }
        }

        public IReadOnlyList<PartitionInfo> GetAllPartitions()
        {
            lock (_lock)
            {
                return _ring.ToList();
            }
        }

        public void AddNode(string nodeId, int virtualNodesPerNode = 256)
        {
            lock (_lock)
            {
                AddNodeInternal(nodeId, virtualNodesPerNode);
                SortRing();
            }
        }

        public void RemoveNode(string nodeId)
        {
            lock (_lock)
            {
                _ring.RemoveAll(p => p.NodeId == nodeId);
                SortRing();
            }
        }

        public IReadOnlyList<PartitionInfo> GetPartitionsForNode(string nodeId)
        {
            lock (_lock)
            {
                return _ring.Where(p => p.NodeId == nodeId).ToList();
            }
        }

        private void AddNodeInternal(string nodeId, int virtualNodesPerNode)
        {
            for (int i = 0; i < virtualNodesPerNode; i++)
            {
                string vnodeName = $"{nodeId}-vnode-{i}";
                uint hash = Hash(vnodeName);
                
                // Let's create partition range (will be fixed/adjusted during SortRing)
                _ring.Add(new PartitionInfo(
                    PartitionId: _ring.Count,
                    NodeId: nodeId,
                    VirtualNodeIndex: i,
                    HashRangeStart: 0,
                    HashRangeEnd: hash
                ));
            }
        }

        private void SortRing()
        {
            if (_ring.Count == 0) return;

            // Sort ring by HashRangeEnd
            var sorted = _ring.OrderBy(p => p.HashRangeEnd).ToList();
            _ring.Clear();

            uint lastEnd = 0;
            for (int i = 0; i < sorted.Count; i++)
            {
                var current = sorted[i];
                _ring.Add(new PartitionInfo(
                    PartitionId: i,
                    NodeId: current.NodeId,
                    VirtualNodeIndex: current.VirtualNodeIndex,
                    HashRangeStart: lastEnd,
                    HashRangeEnd: current.HashRangeEnd
                ));
                lastEnd = current.HashRangeEnd;
            }
        }

        // FNV-1a 32-bit Hash
        private uint Hash(string value)
        {
            uint hash = 2166136261;
            foreach (byte b in Encoding.UTF8.GetBytes(value))
            {
                hash ^= b;
                hash *= 16777619;
            }
            return hash;
        }
    }
}
