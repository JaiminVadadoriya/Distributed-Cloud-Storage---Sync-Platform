using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Policy
{
    public enum PolicyType { Retention, GeoReplication, Lifecycle, AccessControl }
    public record StoragePolicy(string PolicyId, string TenantId, PolicyType Type, string RuleExpression, 
        bool IsActive, DateTime CreatedAt);
    public record PolicyEvaluationResult(string PolicyId, bool IsCompliant, string? ViolationReason);

    public interface IPolicyEngine
    {
        Task CreatePolicyAsync(StoragePolicy policy);
        Task<IReadOnlyList<StoragePolicy>> GetPoliciesAsync(string tenantId, PolicyType? type = null);
        Task<PolicyEvaluationResult> EvaluateAsync(string policyId, string objectKey, string tenantId);
        Task<IReadOnlyList<PolicyEvaluationResult>> EvaluateAllAsync(string objectKey, string tenantId);
        Task EnforcePoliciesAsync(string tenantId);
    }
}
