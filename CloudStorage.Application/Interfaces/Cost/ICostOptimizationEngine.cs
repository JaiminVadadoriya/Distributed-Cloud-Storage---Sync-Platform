using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Cost
{
    public record CostForecast(double S3Cost, double AzureCost, double MinIoCost, double RecommendedSavings);

    public interface ICostOptimizationEngine
    {
        Task<CostForecast> ForecastMonthlyCostsAsync(string tenantId);
        Task<List<string>> GenerateTieringRecommendationsAsync(string tenantId);
    }
}
