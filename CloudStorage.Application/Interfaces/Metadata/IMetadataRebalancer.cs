using System;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Metadata
{
    public record RebalanceResult(int PartitionsMoved, int ObjectsMigrated, TimeSpan Duration, bool Success);

    public interface IMetadataRebalancer
    {
        Task<RebalanceResult> RebalanceAsync(string addedNodeId);
        Task<RebalanceResult> DrainNodeAsync(string removedNodeId);
        Task<bool> VerifyBalanceAsync(double maxSkewPercentage = 10.0);
    }
}
