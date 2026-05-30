using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Identity
{
    public enum FederationProtocol { SAML, OIDC, SCIM }
    public record FederatedIdentity(string SubjectId, string TenantId, FederationProtocol Protocol, 
        string Issuer, Dictionary<string, string> Claims, DateTime AuthenticatedAt);
    public record IdentityProviderConfig(string ProviderId, string TenantId, FederationProtocol Protocol, 
        string MetadataUrl, string ClientId, bool IsActive);

    public interface IIdentityFederationService
    {
        Task<IdentityProviderConfig> RegisterProviderAsync(IdentityProviderConfig config);
        Task<FederatedIdentity?> AuthenticateAsync(string tenantId, FederationProtocol protocol, string token);
        Task<IReadOnlyList<IdentityProviderConfig>> GetProvidersAsync(string tenantId);
        Task ProvisionUserViaSCIMAsync(string tenantId, string scimPayload);
        Task DeprovisionUserViaSCIMAsync(string tenantId, string subjectId);
    }
}
