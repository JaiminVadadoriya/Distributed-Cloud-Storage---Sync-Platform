using System;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces
{
    public interface IDistributedLockService
    {
        Task<IAsyncDisposable?> TryAcquireLockAsync(string resource, TimeSpan expiry, CancellationToken ct = default);
    }
}
