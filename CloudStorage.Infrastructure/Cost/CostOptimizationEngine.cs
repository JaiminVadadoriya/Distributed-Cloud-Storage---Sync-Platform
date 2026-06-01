using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Cost;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.Cost
{
    public class CostOptimizationEngine : ICostOptimizationEngine
    {
        private readonly ApplicationDbContext _dbContext;

        public CostOptimizationEngine(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<CostForecast> ForecastMonthlyCostsAsync(string tenantId)
        {
            // Calculate total storage size in bytes for the tenant from metadata database
            var totalBytes = await _dbContext.ObjectMetadata
                .Where(m => m.TenantId == tenantId)
                .SumAsync(m => m.Size);

            double totalGB = (double)totalBytes / (1024 * 1024 * 1024);

            // Unit costs ($ / GB / Month)
            double s3Unit = 0.023;
            double azureUnit = 0.018;
            double minioUnit = 0.005;

            double s3Cost = totalGB * s3Unit;
            double azureCost = totalGB * azureUnit;
            double minioCost = totalGB * minioUnit;

            // Assume recommendations can save up to 40% of the cost by archiving
            double currentCost = s3Cost; // default to S3-equivalent
            double recommendedSavings = currentCost * 0.4;

            return new CostForecast(s3Cost, azureCost, minioCost, recommendedSavings);
        }

        public async Task<List<string>> GenerateTieringRecommendationsAsync(string tenantId)
        {
            var recommendations = new List<string>();

            // Query all objects for the tenant
            var items = await _dbContext.ObjectMetadata
                .Where(m => m.TenantId == tenantId)
                .ToListAsync();

            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            var ninetyDaysAgo = DateTime.UtcNow.AddDays(-90);

            foreach (var item in items)
            {
                var sizeGB = item.Size / (1024.0 * 1024.0 * 1024.0);
                if (string.Equals(item.CurrentTier, "Hot", StringComparison.OrdinalIgnoreCase) && item.LastModified < thirtyDaysAgo)
                {
                    recommendations.Add($"Object '{item.Key}' has been inactive for >30 days. Recommend moving from Hot to Cool tier. Expected savings: ${sizeGB * 0.01:F3}/month.");
                }
                else if (string.Equals(item.CurrentTier, "Cool", StringComparison.OrdinalIgnoreCase) && item.LastModified < ninetyDaysAgo)
                {
                    recommendations.Add($"Object '{item.Key}' has been inactive for >90 days. Recommend moving from Cool to Archive tier. Expected savings: ${sizeGB * 0.015:F3}/month.");
                }
            }

            if (recommendations.Count == 0)
            {
                recommendations.Add("All storage objects are in optimal tiers. No action required.");
            }

            return recommendations;
        }
    }
}
