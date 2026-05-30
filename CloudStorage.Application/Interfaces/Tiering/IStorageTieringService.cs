using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Domain.Enums;

namespace CloudStorage.Application.Interfaces.Tiering
{
    public interface IStorageTieringService
    {
        Task<TierTransitionResult> MoveToTierAsync(string providerName, string objectKey, StorageTier targetTier, CancellationToken ct = default);
        Task<StorageTier> GetCurrentTierAsync(string providerName, string objectKey, CancellationToken ct = default);
        Task RestoreFromArchiveAsync(string providerName, string objectKey, CancellationToken ct = default);
    }
}
