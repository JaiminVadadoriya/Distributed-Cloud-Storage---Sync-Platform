using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Policy;
using CloudStorage.Application.Interfaces.Metadata;

namespace CloudStorage.Infrastructure.Policy
{
    public class PolicyEngine : IPolicyEngine
    {
        private static readonly ConcurrentDictionary<string, List<StoragePolicy>> Policies = new();
        private readonly IMetadataService _metadataService;

        public PolicyEngine(IMetadataService metadataService)
        {
            _metadataService = metadataService;
        }

        public Task CreatePolicyAsync(StoragePolicy policy)
        {
            if (policy == null) throw new ArgumentNullException(nameof(policy));
            var list = Policies.GetOrAdd(policy.TenantId, _ => new List<StoragePolicy>());
            list.Add(policy);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<StoragePolicy>> GetPoliciesAsync(string tenantId, PolicyType? type = null)
        {
            if (Policies.TryGetValue(tenantId, out var list))
            {
                var filtered = type.HasValue ? list.Where(p => p.Type == type.Value) : list;
                return Task.FromResult<IReadOnlyList<StoragePolicy>>(filtered.ToList());
            }
            return Task.FromResult<IReadOnlyList<StoragePolicy>>(new List<StoragePolicy>());
        }

        public async Task<PolicyEvaluationResult> EvaluateAsync(string policyId, string objectKey, string tenantId)
        {
            var policies = await GetPoliciesAsync(tenantId);
            var policy = policies.FirstOrDefault(p => p.PolicyId == policyId);

            if (policy == null)
            {
                return new PolicyEvaluationResult(policyId, true, "Policy not found, compliant by default.");
            }

            if (!policy.IsActive)
            {
                return new PolicyEvaluationResult(policyId, true, "Policy is inactive.");
            }

            var metadata = await _metadataService.GetObjectAsync(objectKey, tenantId);
            if (metadata == null)
            {
                return new PolicyEvaluationResult(policyId, true, "Object metadata not found.");
            }

            // Simple expression parsing
            var rule = policy.RuleExpression.ToLower();
            
            if (policy.Type == PolicyType.Retention)
            {
                // e.g. "retention > 30 days"
                if (rule.Contains("days"))
                {
                    var parts = rule.Split(' ');
                    var daysIndex = Array.IndexOf(parts, "days");
                    if (daysIndex > 0 && int.TryParse(parts[daysIndex - 1], out var days))
                    {
                        var age = DateTime.UtcNow - metadata.LastModified;
                        if (age.TotalDays < days)
                        {
                            return new PolicyEvaluationResult(policyId, false, $"Object age ({age.TotalDays:F1} days) is less than retention period ({days} days).");
                        }
                    }
                }
            }
            else if (policy.Type == PolicyType.GeoReplication)
            {
                // e.g. "require: us-west-2"
                if (rule.Contains("require:"))
                {
                    var targetRegion = rule.Replace("require:", "").Trim();
                    // Simulate region checking via tags or object properties
                    if (metadata.Tags != null && metadata.Tags.TryGetValue("Region", out var reg))
                    {
                        if (reg.ToLower() != targetRegion)
                        {
                            return new PolicyEvaluationResult(policyId, false, $"Object region '{reg}' does not match required region '{targetRegion}'.");
                        }
                    }
                }
            }

            return new PolicyEvaluationResult(policyId, true, null);
        }

        public async Task<IReadOnlyList<PolicyEvaluationResult>> EvaluateAllAsync(string objectKey, string tenantId)
        {
            var results = new List<PolicyEvaluationResult>();
            var policies = await GetPoliciesAsync(tenantId);

            foreach (var p in policies)
            {
                var res = await EvaluateAsync(p.PolicyId, objectKey, tenantId);
                results.Add(res);
            }

            return results;
        }

        public async Task EnforcePoliciesAsync(string tenantId)
        {
            // Simulate sweeping through objects and enforcing policies
            var policies = await GetPoliciesAsync(tenantId, PolicyType.Lifecycle);
            foreach (var p in policies)
            {
                // e.g., transition objects based on expressions
            }
        }
    }
}
