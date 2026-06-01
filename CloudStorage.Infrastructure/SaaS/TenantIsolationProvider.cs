using System.Threading;
using CloudStorage.Application.Interfaces.SaaS;

namespace CloudStorage.Infrastructure.SaaS
{
    public class TenantIsolationProvider : ITenantIsolationProvider
    {
        private static readonly AsyncLocal<string?> CurrentTenant = new();

        public string GetCurrentTenantId()
        {
            return CurrentTenant.Value ?? "tenant-default";
        }

        public static void SetCurrentTenantId(string tenantId)
        {
            CurrentTenant.Value = tenantId;
        }

        public static void Clear()
        {
            CurrentTenant.Value = null;
        }
    }
}
