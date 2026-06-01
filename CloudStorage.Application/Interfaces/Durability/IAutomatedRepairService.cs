using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Durability
{
    public record RepairResult(string ObjectKey, bool Success, int ShardsReconstructed, TimeSpan Duration, string Strategy);

    public interface IAutomatedRepairService
    {
        Task<RepairResult> RepairObjectAsync(string objectKey, string tenantId);
        Task<IReadOnlyList<RepairResult>> RunRepairScanAsync(string tenantId, int maxObjects = 1000);
    }
}
