using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Replication;
using CloudStorage.Application.Interfaces.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Replication
{
    public record ReplicateObjectCommand(
        string JobId,
        Guid FileId,
        string ObjectKey,
        string SourceProvider,
        string TargetProvider
    );

    public class ReplicationCoordinator : IReplicationCoordinator
    {
        private readonly IMessageQueue _messageQueue;
        private readonly ICacheService _cache;
        private readonly ILogger<ReplicationCoordinator> _logger;
        private readonly List<ReplicationPolicy> _policies;

        public ReplicationCoordinator(
            IMessageQueue messageQueue,
            ICacheService cache,
            IConfiguration configuration,
            ILogger<ReplicationCoordinator> logger)
        {
            _messageQueue = messageQueue;
            _cache = cache;
            _logger = logger;
            _policies = new List<ReplicationPolicy>();
            var section = configuration.GetSection("StorageProvider:ReplicationPolicies");
            foreach (var child in section.GetChildren())
            {
                var policyId = child["PolicyId"] ?? "";
                var source = child["SourceProvider"] ?? "";
                var target = child["TargetProvider"] ?? "";
                var bucket = child["DestinationBucket"] ?? "";
                var isActive = bool.TryParse(child["IsActive"], out var active) && active;
                var mode = child["Mode"] ?? "ActivePassive";
                if (!string.IsNullOrEmpty(source) && !string.IsNullOrEmpty(target))
                {
                    _policies.Add(new ReplicationPolicy(policyId, source, target, bucket, isActive, mode));
                }
            }

            // Default fallback policies if none configured
            if (_policies.Count == 0)
            {
                _policies.Add(new ReplicationPolicy(
                    PolicyId: "default-local-to-minio",
                    SourceProvider: "Local",
                    TargetProvider: "MinIO",
                    DestinationBucket: "cloudstorage-replicas",
                    IsActive: true
                ));
            }
        }

        public async Task ScheduleReplicationAsync(Guid fileId, string objectKey, string sourceProvider, CancellationToken ct = default)
        {
            foreach (var policy in _policies)
            {
                if (policy.IsActive && string.Equals(policy.SourceProvider, sourceProvider, StringComparison.OrdinalIgnoreCase))
                {
                    var jobId = $"{fileId}_{policy.TargetProvider}";
                    var job = new ReplicationJob(
                        JobId: jobId,
                        FileId: fileId,
                        SourceProvider: sourceProvider,
                        TargetProvider: policy.TargetProvider,
                        ObjectKey: objectKey,
                        Status: ReplicationStatus.Pending,
                        CreatedAt: DateTime.UtcNow
                    );

                    await _cache.SetAsync($"replication:job:{jobId}", job, TimeSpan.FromDays(7), ct: ct);

                    _logger.LogInformation("Scheduling replication job {JobId} from {Source} to {Target} for object {ObjectKey}",
                        jobId, sourceProvider, policy.TargetProvider, objectKey);

                    var command = new ReplicateObjectCommand(jobId, fileId, objectKey, sourceProvider, policy.TargetProvider);
                    await _messageQueue.PublishAsync("replication-tasks", command);
                }
            }
        }

        public async Task<ReplicationJob?> GetJobStatusAsync(string jobId, CancellationToken ct = default)
        {
            return await _cache.GetAsync<ReplicationJob>($"replication:job:{jobId}", ct: ct);
        }
    }
}
