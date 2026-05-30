using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Identity;

namespace CloudStorage.Infrastructure.Identity
{
    public class IdentityFederationService : IIdentityFederationService
    {
        private static readonly ConcurrentDictionary<string, List<IdentityProviderConfig>> ProviderConfigs = new();
        private static readonly ConcurrentDictionary<string, List<string>> ProvisionedUsers = new(); // tenantId -> usernames

        public Task<IdentityProviderConfig> RegisterProviderAsync(IdentityProviderConfig config)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));
            var list = ProviderConfigs.GetOrAdd(config.TenantId, _ => new List<IdentityProviderConfig>());
            list.Add(config);
            return Task.FromResult(config);
        }

        public Task<FederatedIdentity?> AuthenticateAsync(string tenantId, FederationProtocol protocol, string token)
        {
            if (string.IsNullOrEmpty(token)) return Task.FromResult<FederatedIdentity?>(null);

            if (!ProviderConfigs.TryGetValue(tenantId, out var configs) || !configs.Any(c => c.IsActive && c.Protocol == protocol))
            {
                return Task.FromResult<FederatedIdentity?>(null); // no active IDP
            }

            var activeIdp = configs.First(c => c.IsActive && c.Protocol == protocol);

            // Simple token authentication simulation
            if (token.StartsWith("valid-token-"))
            {
                var username = token.Replace("valid-token-", "");
                var claims = new Dictionary<string, string>
                {
                    { "name", username },
                    { "email", $"{username}@federated.com" },
                    { "role", "User" }
                };

                return Task.FromResult<FederatedIdentity?>(new FederatedIdentity(
                    SubjectId: $"sub-{username}",
                    TenantId: tenantId,
                    Protocol: protocol,
                    Issuer: activeIdp.MetadataUrl,
                    Claims: claims,
                    AuthenticatedAt: DateTime.UtcNow
                ));
            }

            return Task.FromResult<FederatedIdentity?>(null);
        }

        public Task<IReadOnlyList<IdentityProviderConfig>> GetProvidersAsync(string tenantId)
        {
            if (ProviderConfigs.TryGetValue(tenantId, out var list))
            {
                return Task.FromResult<IReadOnlyList<IdentityProviderConfig>>(list.ToList());
            }

            return Task.FromResult<IReadOnlyList<IdentityProviderConfig>>(new List<IdentityProviderConfig>());
        }

        public Task ProvisionUserViaSCIMAsync(string tenantId, string scimPayload)
        {
            if (string.IsNullOrEmpty(scimPayload)) throw new ArgumentException("SCIM payload cannot be empty");

            // Simple parser: extract userName/emails
            string user = "scim-user";
            if (scimPayload.Contains("userName"))
            {
                var idx = scimPayload.IndexOf("userName");
                // extract substring
                var start = scimPayload.IndexOf(":", idx) + 1;
                var end = scimPayload.IndexOf(",", start);
                if (end == -1) end = scimPayload.IndexOf("}", start);
                if (start > 0 && end > start)
                {
                    user = scimPayload.Substring(start, end - start).Replace("\"", "").Trim();
                }
            }

            var list = ProvisionedUsers.GetOrAdd(tenantId, _ => new List<string>());
            if (!list.Contains(user))
            {
                list.Add(user);
            }

            return Task.CompletedTask;
        }

        public Task DeprovisionUserViaSCIMAsync(string tenantId, string subjectId)
        {
            if (ProvisionedUsers.TryGetValue(tenantId, out var list))
            {
                list.Remove(subjectId);
            }
            return Task.CompletedTask;
        }

        public static bool IsUserProvisioned(string tenantId, string userName)
        {
            if (ProvisionedUsers.TryGetValue(tenantId, out var list))
            {
                return list.Contains(userName);
            }
            return false;
        }
    }
}
