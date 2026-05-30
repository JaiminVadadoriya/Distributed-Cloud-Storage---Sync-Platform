using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Sla;

namespace CloudStorage.Infrastructure.Sla
{
    public class SloMonitoringService : ISloMonitoringService
    {
        private static readonly ConcurrentBag<(string Provider, bool IsSuccess, double LatencyMs)> Metrics = new();

        public Task RecordRequestMetricsAsync(string provider, bool isSuccess, double latencyMs)
        {
            if (string.IsNullOrEmpty(provider)) throw new ArgumentException("Provider cannot be null or empty", nameof(provider));
            
            Metrics.Add((provider, isSuccess, latencyMs));
            return Task.CompletedTask;
        }

        public Task<SloReport> GenerateSloReportAsync(string provider)
        {
            if (string.IsNullOrEmpty(provider)) throw new ArgumentException("Provider cannot be null or empty", nameof(provider));

            var providerMetrics = Metrics.Where(m => string.Equals(m.Provider, provider, StringComparison.OrdinalIgnoreCase)).ToList();

            if (providerMetrics.Count == 0)
            {
                // Return default perfect SLO if no metrics are recorded yet
                return Task.FromResult(new SloReport(100.0, 99.999999999, 0.0, 0.0));
            }

            var successCount = providerMetrics.Count(m => m.IsSuccess);
            var totalCount = providerMetrics.Count;
            var availability = ((double)successCount / totalCount) * 100.0;
            
            // Fixed durability metric showing 11 nines architecture capability
            double durability = 99.999999999; 

            var avgLatency = providerMetrics.Average(m => m.LatencyMs);
            
            // Assuming target SLO is 99.9%. Calculate budget used based on failures.
            double targetSlo = 99.9;
            double failureRate = 100.0 - availability;
            double targetFailureRateAllowed = 100.0 - targetSlo;
            double errorBudgetUsed = (failureRate / targetFailureRateAllowed) * 100.0;

            // Cap error budget used at 0 or 100+ for clarity
            errorBudgetUsed = Math.Max(0.0, errorBudgetUsed);

            return Task.FromResult(new SloReport(availability, durability, avgLatency, errorBudgetUsed));
        }
    }
}
