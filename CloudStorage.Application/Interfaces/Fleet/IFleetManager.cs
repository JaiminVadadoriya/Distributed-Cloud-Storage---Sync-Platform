using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Fleet
{
    public enum NodeStatus { Active, Draining, Maintenance, Decommissioned }
    public record FleetNode(string NodeId, NodeStatus Status, string Region, string Version, 
        DateTime LastHeartbeat, double CpuUsage, double MemoryUsage, long StorageUsedBytes);
    public record RollingUpgradeResult(int NodesUpgraded, int NodesFailed, TimeSpan Duration, string TargetVersion);

    public interface IFleetManager
    {
        Task RegisterNodeAsync(FleetNode node);
        Task<IReadOnlyList<FleetNode>> GetFleetStatusAsync();
        Task<FleetNode?> GetNodeAsync(string nodeId);
        Task SetNodeStatusAsync(string nodeId, NodeStatus status);
        Task<RollingUpgradeResult> ExecuteRollingUpgradeAsync(string targetVersion);
        Task DecommissionNodeAsync(string nodeId);
    }
}
