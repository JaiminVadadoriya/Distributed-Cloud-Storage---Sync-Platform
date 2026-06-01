using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Consensus;

namespace CloudStorage.Infrastructure.Consensus
{
    public class ConsensusService : IConsensusService
    {
        private readonly ILeaderElectionService _leaderElection;
        
        // Simulated cluster nodes
        private static readonly List<string> Nodes = new() { "node-1", "node-2", "node-3" };
        
        // Node health status (for partitions / chaos injection)
        public static ConcurrentDictionary<string, bool> NodeHealth { get; } = new();

        // Node-specific storage state representing replicated state machine state
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string>> NodeStateStores = new();

        // Globally committed/agreed state
        private static readonly ConcurrentDictionary<string, string> CommittedState = new();

        static ConsensusService()
        {
            foreach (var node in Nodes)
            {
                NodeHealth[node] = true;
                NodeStateStores[node] = new ConcurrentDictionary<string, string>();
            }
        }

        public ConsensusService(ILeaderElectionService leaderElection)
        {
            _leaderElection = leaderElection;
        }

        public async Task<bool> ProposeStateChangeAsync(string key, string value)
        {
            // 1. Resolve current leader
            var leaderNode = await _leaderElection.GetCurrentLeaderAsync();
            if (string.IsNullOrEmpty(leaderNode))
            {
                // No leader - try to claim leadership for node-1 as a fallback
                var claimed = await _leaderElection.TryAcquireLeadershipAsync("node-1");
                if (claimed)
                {
                    leaderNode = "node-1";
                }
                else
                {
                    return false; // Cannot propose without a leader
                }
            }

            // 2. Check if leader itself is healthy
            if (!NodeHealth.TryGetValue(leaderNode, out var leaderHealthy) || !leaderHealthy)
            {
                return false; // Leader is partitioned / dead
            }

            // 3. Propose to followers and check quorum (AppendEntries simulation)
            int consensusCount = 0;
            foreach (var node in Nodes)
            {
                if (NodeHealth.TryGetValue(node, out var isHealthy) && isHealthy)
                {
                    // Simulated RPC call accept: write to uncommitted log / state of that node
                    NodeStateStores[node][key] = value;
                    consensusCount++;
                }
            }

            int majority = (Nodes.Count / 2) + 1;
            if (consensusCount >= majority)
            {
                // Commit the value
                CommittedState[key] = value;
                return true;
            }

            // Clean up uncommitted changes on failure
            foreach (var node in Nodes)
            {
                if (NodeStateStores.TryGetValue(node, out var store))
                {
                    store.TryRemove(key, out _);
                }
            }

            return false;
        }

        public Task<string?> GetConsensusStateAsync(string key)
        {
            if (CommittedState.TryGetValue(key, out var val))
            {
                return Task.FromResult<string?>(val);
            }
            return Task.FromResult<string?>(null);
        }
    }
}
