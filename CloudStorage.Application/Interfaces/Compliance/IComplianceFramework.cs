using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Compliance
{
    public enum ComplianceStandard { GDPR, SOC2, HIPAA }
    public record ComplianceControl(string ControlId, ComplianceStandard Standard, string Name, 
        string Description, bool IsImplemented, string Evidence);
    public record ComplianceReport(ComplianceStandard Standard, IReadOnlyList<ComplianceControl> Controls, 
        double CompliancePercentage, DateTime GeneratedAt);

    public interface IComplianceFramework
    {
        Task<ComplianceReport> GenerateReportAsync(string tenantId, ComplianceStandard standard);
        Task<IReadOnlyList<ComplianceControl>> GetControlsAsync(ComplianceStandard standard);
        Task<bool> ValidateDataResidencyAsync(string tenantId, string objectKey, string targetRegion);
        Task<bool> EnforceRightToDeleteAsync(string tenantId, string subjectId);
        Task RecordAuditEventAsync(string tenantId, string action, string resourceId, string actorId);
    }
}
