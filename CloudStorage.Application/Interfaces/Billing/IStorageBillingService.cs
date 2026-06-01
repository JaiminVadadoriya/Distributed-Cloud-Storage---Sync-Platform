using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Billing
{
    public record UsageMeter(string TenantId, long StorageBytes, long EgressBytes, long IngressBytes, 
        long ApiCalls, DateTime PeriodStart, DateTime PeriodEnd);
    public record BillingInvoice(string InvoiceId, string TenantId, decimal TotalCost, 
        decimal StorageCost, decimal EgressCost, decimal ApiCallCost, UsageMeter Usage, DateTime GeneratedAt);

    public interface IStorageBillingService
    {
        Task RecordUsageAsync(string tenantId, long storageBytes, long egressBytes, long ingressBytes, int apiCalls);
        Task<UsageMeter> GetCurrentUsageAsync(string tenantId);
        Task<BillingInvoice> GenerateInvoiceAsync(string tenantId, DateTime periodStart, DateTime periodEnd);
        Task<IReadOnlyList<BillingInvoice>> GetInvoiceHistoryAsync(string tenantId, int limit = 12);
    }
}
