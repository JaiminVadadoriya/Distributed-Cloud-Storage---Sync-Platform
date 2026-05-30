using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Domain.Enums;

namespace CloudStorage.Application.Interfaces.Tiering
{
    public interface IStorageCostAnalyzer
    {
        Task<double> EstimateMonthlyCostAsync(string providerName, long totalBytes, CancellationToken ct = default);
        double GetTierCostPerGB(string providerName, StorageTier tier);
    }
}
