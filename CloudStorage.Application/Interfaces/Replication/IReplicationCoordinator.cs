using System;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Replication
{
    public interface IReplicationCoordinator
    {
        Task ScheduleReplicationAsync(Guid fileId, string objectKey, string sourceProvider, CancellationToken ct = default);
        Task<ReplicationJob?> GetJobStatusAsync(string jobId, CancellationToken ct = default);
    }
}
