using System;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Replication
{
    public interface IReplicationProvider
    {
        Task ReplicateAsync(Guid fileId, string objectKey, string sourceProvider, string targetProvider, CancellationToken ct = default);
    }
}
