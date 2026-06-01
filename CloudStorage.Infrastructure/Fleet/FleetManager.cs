using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Fleet;

namespace CloudStorage.Infrastructure.Fleet
{
    public class FleetManager : IFleetManager
    {
        private static readonly ConcurrentDictionary<string, FleetNode> NodesRegistry = new();

        public Task RegisterNodeAsync(FleetNode node)
        {
            if (node == null) throw new ArgumentNullException(nameof(node));
            NodesRegistry[node.NodeId] = node;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<FleetNode>> GetFleetStatusAsync()
        {
            return Task.FromResult<IReadOnlyList<FleetNode>>(NodesRegistry.Values.ToList());
        }

        public Task<FleetNode?> GetNodeAsync(string nodeId)
        {
            if (NodesRegistry.TryGetValue(nodeId, out var node))
            {
                return Task.FromResult<FleetNode?>(node);
            }
            return Task.FromResult<FleetNode?>(null);
        }

        public Task SetNodeStatusAsync(string nodeId, NodeStatus status)
        {
            if (NodesRegistry.TryGetValue(nodeId, out var node))
            {
                NodesRegistry[nodeId] = node with { Status = status, LastHeartbeat = DateTime.UtcNow };
            }
            return Task.CompletedTask;
        }

        public async Task<RollingUpgradeResult> ExecuteRollingUpgradeAsync(string targetVersion)
        {
            var sw = Stopwatch.StartNew();
            int upgraded = 0;
            int failed = 0;

            var nodes = NodesRegistry.Keys.ToList();
            foreach (var nodeId in nodes)
            {
                var node = NodesRegistry[nodeId];

                // 1. Drain node
                await SetNodeStatusAsync(nodeId, NodeStatus.Draining);
                await Task.Delay(50); // Simulate connections draining

                try
                {
                    // 2. Perform mock upgrade
                    NodesRegistry[nodeId] = node with
                    {
                        Version = targetVersion,
                        Status = NodeStatus.Active,
                        LastHeartbeat = DateTime.UtcNow
                    };
                    upgraded++;
                }
                catch
                {
                    await SetNodeStatusAsync(nodeId, NodeStatus.Maintenance);
                    failed++;
                }
            }

            sw.Stop();
            return new RollingUpgradeResult(upgraded, failed, sw.Elapsed, targetVersion);
        }

        public Task DecommissionNodeAsync(string nodeId)
        {
            if (NodesRegistry.TryGetValue(nodeId, out var node))
            {
                NodesRegistry[nodeId] = node with { Status = NodeStatus.Decommissioned, LastHeartbeat = DateTime.UtcNow };
            }
            return Task.CompletedTask;
        }
    }
}
