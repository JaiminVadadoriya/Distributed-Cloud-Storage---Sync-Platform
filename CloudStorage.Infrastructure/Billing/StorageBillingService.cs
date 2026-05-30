using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Billing;

namespace CloudStorage.Infrastructure.Billing
{
    public class StorageBillingService : IStorageBillingService
    {
        private static readonly ConcurrentDictionary<string, UsageMeter> UsageRegistry = new();
        private static readonly ConcurrentDictionary<string, List<BillingInvoice>> InvoiceHistory = new();

        public Task RecordUsageAsync(string tenantId, long storageBytes, long egressBytes, long ingressBytes, int apiCalls)
        {
            var now = DateTime.UtcNow;
            UsageRegistry.AddOrUpdate(tenantId,
                _ => new UsageMeter(tenantId, storageBytes, egressBytes, ingressBytes, apiCalls, now, now.AddDays(30)),
                (_, existing) => new UsageMeter(
                    tenantId,
                    existing.StorageBytes + storageBytes,
                    existing.EgressBytes + egressBytes,
                    existing.IngressBytes + ingressBytes,
                    existing.ApiCalls + apiCalls,
                    existing.PeriodStart,
                    existing.PeriodEnd
                )
            );

            return Task.CompletedTask;
        }

        public Task<UsageMeter> GetCurrentUsageAsync(string tenantId)
        {
            if (UsageRegistry.TryGetValue(tenantId, out var meter))
            {
                return Task.FromResult(meter);
            }

            var now = DateTime.UtcNow;
            return Task.FromResult(new UsageMeter(tenantId, 0, 0, 0, 0, now, now.AddDays(30)));
        }

        public async Task<BillingInvoice> GenerateInvoiceAsync(string tenantId, DateTime periodStart, DateTime periodEnd)
        {
            var usage = await GetCurrentUsageAsync(tenantId);

            // Cost Calculations (simplified rate card):
            // - Storage: $0.02 / GB (1,073,741,824 bytes)
            // - Egress: $0.08 / GB
            // - API Calls: $0.005 / 1000 calls
            decimal gigabyte = 1024 * 1024 * 1024;
            decimal storageGb = usage.StorageBytes / gigabyte;
            decimal egressGb = usage.EgressBytes / gigabyte;

            decimal storageCost = Math.Max(0.00m, storageGb * 0.02m);
            decimal egressCost = Math.Max(0.00m, egressGb * 0.08m);
            decimal apiCost = Math.Max(0.00m, (usage.ApiCalls / 1000.0m) * 0.005m);

            decimal total = storageCost + egressCost + apiCost;

            var invoice = new BillingInvoice(
                InvoiceId: Guid.NewGuid().ToString(),
                TenantId: tenantId,
                TotalCost: total,
                StorageCost: storageCost,
                EgressCost: egressCost,
                ApiCallCost: apiCost,
                Usage: usage,
                GeneratedAt: DateTime.UtcNow
            );

            var list = InvoiceHistory.GetOrAdd(tenantId, _ => new List<BillingInvoice>());
            list.Add(invoice);

            return invoice;
        }

        public Task<IReadOnlyList<BillingInvoice>> GetInvoiceHistoryAsync(string tenantId, int limit = 12)
        {
            if (InvoiceHistory.TryGetValue(tenantId, out var list))
            {
                return Task.FromResult<IReadOnlyList<BillingInvoice>>(list.Take(limit).ToList());
            }

            return Task.FromResult<IReadOnlyList<BillingInvoice>>(new List<BillingInvoice>());
        }
    }
}
