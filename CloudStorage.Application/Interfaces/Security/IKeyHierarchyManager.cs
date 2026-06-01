using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Security
{
    public interface IKeyHierarchyManager
    {
        Task<string> DeriveTenantKeyAsync(string masterKey, string tenantId);
        Task<string> DeriveUserKeyAsync(string tenantKey, string userId);
    }
}
