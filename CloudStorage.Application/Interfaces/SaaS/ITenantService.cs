using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.SaaS
{
    public record TenantConfig(string TenantId, long StorageQuotaBytes, string EncryptionKeyId, string ReplicationStrategy);

    public interface ITenantService
    {
        Task CreateTenantAsync(TenantConfig config);
        Task<TenantConfig?> GetTenantConfigAsync(string tenantId);
        Task<bool> ValidateQuotaAsync(string tenantId, long additionalBytes);
    }
}
