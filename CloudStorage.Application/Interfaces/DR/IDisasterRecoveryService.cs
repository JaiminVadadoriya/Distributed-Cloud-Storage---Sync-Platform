using System;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.DR
{
    public record DRMetrics(TimeSpan RecoveryPointObjective, TimeSpan RecoveryTimeObjective, 
        DateTime LastBackup, DateTime LastDrillDate, bool DrillPassed);
    public record DRDrillResult(string DrillId, bool Passed, TimeSpan ActualRTO, TimeSpan ActualRPO, 
        int ObjectsRecovered, int ObjectsFailed, string Report);

    public interface IDisasterRecoveryService
    {
        Task<DRMetrics> GetDRMetricsAsync(string tenantId);
        Task<DRDrillResult> ExecuteDrillAsync(string tenantId, string targetRegion);
        Task InitiateFailoverAsync(string tenantId, string fromRegion, string toRegion);
        Task<bool> ValidateBackupIntegrityAsync(string tenantId);
    }
}
