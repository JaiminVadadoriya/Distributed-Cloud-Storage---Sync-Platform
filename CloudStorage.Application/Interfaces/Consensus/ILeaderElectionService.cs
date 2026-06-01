using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Consensus
{
    public interface ILeaderElectionService
    {
        Task<bool> TryAcquireLeadershipAsync(string nodeId);
        Task ReleaseLeadershipAsync(string nodeId);
        Task<string?> GetCurrentLeaderAsync();
    }
}
