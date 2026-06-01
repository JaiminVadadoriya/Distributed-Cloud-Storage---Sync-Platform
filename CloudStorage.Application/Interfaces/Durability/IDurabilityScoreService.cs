using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Durability
{
    public record DurabilityReport(string ObjectKey, double DurabilityScore, int HealthyReplicas, int TotalReplicas, 
        int HealthyShards, int TotalShards, string Strategy, bool NeedsRepair);

    public interface IDurabilityScoreService
    {
        Task<DurabilityReport> AssessObjectDurabilityAsync(string objectKey, string tenantId);
        Task<IReadOnlyList<DurabilityReport>> GetDegradedObjectsAsync(string tenantId, double threshold = 0.99);
    }
}
