using System.Collections.Generic;

namespace CloudStorage.Application.Interfaces.Metadata
{
    public record PartitionInfo(int PartitionId, string NodeId, int VirtualNodeIndex, uint HashRangeStart, uint HashRangeEnd);

    public interface IMetadataPartitionManager
    {
        void InitializeRing(IReadOnlyList<string> nodeIds, int virtualNodesPerNode = 256);
        PartitionInfo GetPartition(string partitionKey);
        IReadOnlyList<PartitionInfo> GetAllPartitions();
        void AddNode(string nodeId, int virtualNodesPerNode = 256);
        void RemoveNode(string nodeId);
        IReadOnlyList<PartitionInfo> GetPartitionsForNode(string nodeId);
    }
}
