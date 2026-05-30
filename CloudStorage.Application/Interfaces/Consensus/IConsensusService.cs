using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Consensus
{
    public enum ClusterNodeState { Leader, Follower, Candidate }

    public interface IConsensusService
    {
        Task<bool> ProposeStateChangeAsync(string key, string value);
        Task<string?> GetConsensusStateAsync(string key);
    }
}
