using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Security;

namespace CloudStorage.Infrastructure.Security
{
    public class KeyHierarchyManager : IKeyHierarchyManager
    {
        public Task<string> DeriveTenantKeyAsync(string masterKey, string tenantId)
        {
            if (string.IsNullOrEmpty(masterKey)) throw new ArgumentException("Master key cannot be null or empty", nameof(masterKey));
            if (string.IsNullOrEmpty(tenantId)) throw new ArgumentException("Tenant ID cannot be null or empty", nameof(tenantId));

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(masterKey));
            var tenantKeyBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(tenantId));
            return Task.FromResult(Convert.ToHexString(tenantKeyBytes).ToLowerInvariant());
        }

        public Task<string> DeriveUserKeyAsync(string tenantKey, string userId)
        {
            if (string.IsNullOrEmpty(tenantKey)) throw new ArgumentException("Tenant key cannot be null or empty", nameof(tenantKey));
            if (string.IsNullOrEmpty(userId)) throw new ArgumentException("User ID cannot be null or empty", nameof(userId));

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(tenantKey));
            var userKeyBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(userId));
            return Task.FromResult(Convert.ToHexString(userKeyBytes).ToLowerInvariant());
        }
    }
}
