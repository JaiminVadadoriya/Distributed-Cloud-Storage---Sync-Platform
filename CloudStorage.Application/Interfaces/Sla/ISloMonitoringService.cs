using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Sla
{
    public record SloReport(double AvailabilityPercentage, double DurabilityPercentage, double AverageLatencyMs, double ErrorBudgetUsed);

    public interface ISloMonitoringService
    {
        Task RecordRequestMetricsAsync(string provider, bool isSuccess, double latencyMs);
        Task<SloReport> GenerateSloReportAsync(string provider);
    }
}
