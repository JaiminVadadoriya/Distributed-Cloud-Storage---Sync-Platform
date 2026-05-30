using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Tiering;
using CloudStorage.Domain.Enums;

namespace CloudStorage.Infrastructure.Tiering
{
    public class StorageCostAnalyzer : IStorageCostAnalyzer
    {
        public Task<double> EstimateMonthlyCostAsync(string providerName, long totalBytes, CancellationToken ct = default)
        {
            var provider = providerName.ToLowerInvariant();
            var gb = totalBytes / (1024.0 * 1024.0 * 1024.0);

            var costPerGb = provider switch
            {
                "azure" => 0.018,
                "s3" => 0.023,
                "minio" => 0.005,
                "local" => 0.002,
                _ => 0.020
            };

            return Task.FromResult(gb * costPerGb);
        }

        public double GetTierCostPerGB(string providerName, StorageTier tier)
        {
            var provider = providerName.ToLowerInvariant();
            return provider switch
            {
                "azure" => tier switch
                {
                    StorageTier.Hot => 0.018,
                    StorageTier.Warm => 0.010,
                    StorageTier.Cold => 0.0036,
                    StorageTier.Archive => 0.00099,
                    _ => 0.018
                },
                "s3" => tier switch
                {
                    StorageTier.Hot => 0.023,
                    StorageTier.Warm => 0.0125,
                    StorageTier.Cold => 0.0036,
                    StorageTier.Archive => 0.00099,
                    _ => 0.023
                },
                _ => tier switch
                {
                    StorageTier.Hot => 0.010,
                    StorageTier.Warm => 0.005,
                    StorageTier.Cold => 0.002,
                    StorageTier.Archive => 0.001,
                    _ => 0.010
                }
            };
        }
    }
}
