using System;
using System.Collections.Generic;
using CloudStorage.Application.Interfaces.Policy;
using CloudStorage.Application.Interfaces.Replication;
using CloudStorage.Application.Interfaces.Routing;
using CloudStorage.Application.Interfaces.SaaS;
using CloudStorage.Application.Interfaces.Search;
using CloudStorage.Application.Interfaces.Security;
using CloudStorage.Application.Interfaces.Sla;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Tiering;
using CloudStorage.Application.Interfaces.Transactions;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Application.Interfaces.Versioning;
using CloudStorage.Application.Interfaces.Namespace;
using CloudStorage.Application.Interfaces.Metadata;
using CloudStorage.Application.Interfaces.Merkle;
using CloudStorage.Application.Interfaces.Identity;
using CloudStorage.Application.Interfaces.Gateway;
using CloudStorage.Application.Interfaces.Fleet;
using CloudStorage.Application.Interfaces.Durability;
using CloudStorage.Application.Interfaces.DR;
using CloudStorage.Application.Interfaces.Cost;
using CloudStorage.Application.Interfaces.Compliance;
using CloudStorage.Application.Interfaces.CDC;
using CloudStorage.Application.Interfaces.Billing;
using CloudStorage.Application.Interfaces.Benchmarks;
using CloudStorage.Application.Events;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Enums;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public partial class ApplicationModelTests
    {
        [Fact]
        public void RecordTypes_ShouldInitializeCorrectly()
        {
            var now = DateTime.UtcNow;

            // 1. VersionNode
            var vn = new VersionNode("v1", "v0", "hash1", "author1", "main");
            Assert.Equal("v1", vn.VersionId);
            Assert.Equal("v0", vn.ParentVersionId);
            Assert.Equal("hash1", vn.Hash);
            Assert.Equal("author1", vn.Author);
            Assert.Equal("main", vn.BranchName);

            // 2. ChunkPlan
            var cp = new ChunkPlan(1, 1024, 2048);
            Assert.Equal(1, cp.ChunkIndex);
            Assert.Equal(1024, cp.Offset);
            Assert.Equal(2048, cp.Size);

            // 3. UploadPlan
            var fileId = Guid.NewGuid();
            var up = new UploadPlan(fileId, "key", "S3", "Multipart", 4096, new List<ChunkPlan> { cp });
            Assert.Equal(fileId, up.FileId);
            Assert.Equal("key", up.ObjectKey);
            Assert.Equal("S3", up.ProviderName);
            Assert.Equal("Multipart", up.StrategyName);
            Assert.Equal(4096, up.FileSizeBytes);
            Assert.Contains(cp, up.Chunks);

            // 4. UploadProgress
            var progress = new UploadProgress(fileId, 512, 1024, 50.0);
            Assert.Equal(fileId, progress.FileId);
            Assert.Equal(512, progress.BytesUploaded);
            Assert.Equal(1024, progress.TotalBytes);
            Assert.Equal(50.0, progress.PercentComplete);

            // 5. SagaStep
            var step = new SagaStep("s1", "step1", SagaStepState.Completed, "no error");
            Assert.Equal("s1", step.StepId);
            Assert.Equal("step1", step.Name);
            Assert.Equal(SagaStepState.Completed, step.State);
            Assert.Equal("no error", step.Error);

            // 6. SagaTransaction
            var tx = new SagaTransaction("t1", "tx1", new List<SagaStep> { step }, true, false, "idemp1");
            Assert.Equal("t1", tx.TransactionId);
            Assert.Equal("tx1", tx.Name);
            Assert.Contains(step, tx.Steps);
            Assert.True(tx.IsCompleted);
            Assert.False(tx.IsCompensated);
            Assert.Equal("idemp1", tx.IdempotencyKey);

            // 7. TierTransitionResult
            var tierResult = new TierTransitionResult(true, "objKey", StorageTier.Hot, StorageTier.Cold, "err");
            Assert.True(tierResult.Success);
            Assert.Equal("objKey", tierResult.ObjectKey);
            Assert.Equal(StorageTier.Hot, tierResult.FromTier);
            Assert.Equal(StorageTier.Cold, tierResult.ToTier);
            Assert.Equal("err", tierResult.Error);

            // 8. StorageUploadResult
            var uploadResult = new StorageUploadResult("key", "/path", "etag1");
            Assert.Equal("key", uploadResult.ObjectKey);
            Assert.Equal("/path", uploadResult.StoragePath);
            Assert.Equal("etag1", uploadResult.ETag);

            // 9. StorageUploadOptions
            var metaDict = new Dictionary<string, string> { { "k1", "v1" } };
            var uploadOptions = new StorageUploadOptions
            {
                ContentType = "application/json",
                Metadata = metaDict,
                Overwrite = false
            };
            Assert.Equal("application/json", uploadOptions.ContentType);
            Assert.Equal(metaDict, uploadOptions.Metadata);
            Assert.False(uploadOptions.Overwrite);

            // 10. StorageDownloadOptions
            var downloadOptions = new StorageDownloadOptions
            {
                RangeStart = 10,
                RangeEnd = 20
            };
            Assert.Equal(10, downloadOptions.RangeStart);
            Assert.Equal(20, downloadOptions.RangeEnd);

            // 11. StorageObjectMetadata
            var objectMeta = new StorageObjectMetadata("key", 100, "text/plain", now, metaDict, true);
            Assert.Equal("key", objectMeta.ObjectKey);
            Assert.Equal(100, objectMeta.Size);
            Assert.Equal("text/plain", objectMeta.ContentType);
            Assert.Equal(now, objectMeta.LastModified);
            Assert.Equal(metaDict, objectMeta.CustomMetadata);
            Assert.True(objectMeta.IsEncrypted);

            // 12. PresignedUrlResult
            var presigned = new PresignedUrlResult("http://url", now, "key");
            Assert.Equal("http://url", presigned.Url);
            Assert.Equal(now, presigned.ExpiresAt);
            Assert.Equal("key", presigned.ObjectKey);

            // 13. ChunkVerificationResult
            var chunkVer = new ChunkVerificationResult(true, new[] { 1, 2 });
            Assert.True(chunkVer.IsValid);
            Assert.Equal(new[] { 1, 2 }, chunkVer.MissingChunkIndices);

            // 14. StorageProviderCapabilities
#pragma warning disable CS0618
            var cap = new StorageProviderCapabilities(true, true, true, true, 1000L);
            Assert.True(cap.SupportsPresignedUrls);
            Assert.True(cap.SupportsServerSideEncryption);
            Assert.True(cap.SupportsRangeRequests);
            Assert.True(cap.SupportsMultipartUpload);
            Assert.Equal(1000L, cap.MaxObjectSize);
#pragma warning restore CS0618

            // 15. ReplicationPolicy
            var repPolicy = new ReplicationPolicy("pol1", "aws", "azure", "dest", true, "ActivePassive");
            Assert.Equal("pol1", repPolicy.PolicyId);
            Assert.Equal("aws", repPolicy.SourceProvider);
            Assert.Equal("azure", repPolicy.TargetProvider);
            Assert.Equal("dest", repPolicy.DestinationBucket);
            Assert.True(repPolicy.IsActive);
            Assert.Equal("ActivePassive", repPolicy.Mode);

            // 16. LifecycleRule
            var lifeRule = new LifecycleRule("rule1", "prefix/", 30, StorageTier.Cold, 365, true);
            Assert.Equal("rule1", lifeRule.RuleId);
            Assert.Equal("prefix/", lifeRule.Prefix);
            Assert.Equal(30, lifeRule.TransitionAfterDays);
            Assert.Equal(StorageTier.Cold, lifeRule.TargetTier);
            Assert.Equal(365, lifeRule.ExpirationDays);
            Assert.True(lifeRule.IsActive);

            // 17. SloReport
            var slo = new SloReport(99.9, 99.99, 150.0, 5.0);
            Assert.Equal(99.9, slo.AvailabilityPercentage);
            Assert.Equal(99.99, slo.DurabilityPercentage);
            Assert.Equal(150.0, slo.AverageLatencyMs);
            Assert.Equal(5.0, slo.ErrorBudgetUsed);

            // 18. KeyMetadata
            var keyMeta = new KeyMetadata("keyId", EncryptionAlgorithm.Aes256Gcm, now, now, 1);
            Assert.Equal("keyId", keyMeta.KeyId);
            Assert.Equal(EncryptionAlgorithm.Aes256Gcm, keyMeta.Algorithm);
            Assert.Equal(now, keyMeta.CreatedAt);
            Assert.Equal(now, keyMeta.RotatedAt);
            Assert.Equal(1, keyMeta.Version);

            // 19. IntegrityResult
            var integrity = new IntegrityResult(true, "h1", "h2");
            Assert.True(integrity.IsValid);
            Assert.Equal("h1", integrity.ComputedHash);
            Assert.Equal("h2", integrity.ExpectedHash);

            // 20. SearchResultItem
            var searchItem = new SearchResultItem("key", "tenant", 0.95, metaDict);
            Assert.Equal("key", searchItem.Key);
            Assert.Equal("tenant", searchItem.TenantId);
            Assert.Equal(0.95, searchItem.Score);
            Assert.Equal(metaDict, searchItem.Metadata);

            // 21. TenantConfig
            var tenantConfig = new TenantConfig("tenant1", 1000L, "key", "ActivePassive");
            Assert.Equal("tenant1", tenantConfig.TenantId);
            Assert.Equal(1000L, tenantConfig.StorageQuotaBytes);
            Assert.Equal("key", tenantConfig.EncryptionKeyId);
            Assert.Equal("ActivePassive", tenantConfig.ReplicationStrategy);

            // 22. ProviderHealthScore
            var healthScore = new ProviderHealthScore("aws", HealthState.Healthy, 0.99, 120.0, false);
            Assert.Equal("aws", healthScore.ProviderName);
            Assert.Equal(HealthState.Healthy, healthScore.State);
            Assert.Equal(0.99, healthScore.HealthScore);
            Assert.Equal(120.0, healthScore.AverageLatencyMs);
            Assert.False(healthScore.IsCircuitOpen);

            // 23. RoutingDecision
            var routeDecision = new RoutingDecision("aws", "health", "reason");
            Assert.Equal("aws", routeDecision.SelectedProvider);
            Assert.Equal("health", routeDecision.StrategyUsed);
            Assert.Equal("reason", routeDecision.Reason);

            // 24. FailoverState
            var failover = new FailoverState("aws", "azure", true, now);
            Assert.Equal("aws", failover.PrimaryProvider);
            Assert.Equal("azure", failover.CurrentProvider);
            Assert.True(failover.IsFailedOver);
            Assert.Equal(now, failover.LastFailoverTime);

            // 25. ReplicationJob
            var job = new ReplicationJob("job1", fileId, "aws", "azure", "key", ReplicationStatus.InProgress, now, now, "error", 1);
            Assert.Equal("job1", job.JobId);
            Assert.Equal(fileId, job.FileId);
            Assert.Equal("aws", job.SourceProvider);
            Assert.Equal("azure", job.TargetProvider);
            Assert.Equal("key", job.ObjectKey);
            Assert.Equal(ReplicationStatus.InProgress, job.Status);
            Assert.Equal(now, job.CreatedAt);
            Assert.Equal(now, job.CompletedAt);
            Assert.Equal("error", job.Error);
            Assert.Equal(1, job.RetryCount);

            // 26. StoragePolicy
            var policy = new StoragePolicy("pol1", "tenant1", PolicyType.Retention, "expression", true, now);
            Assert.Equal("pol1", policy.PolicyId);
            Assert.Equal("tenant1", policy.TenantId);
            Assert.Equal(PolicyType.Retention, policy.Type);
            Assert.Equal("expression", policy.RuleExpression);
            Assert.True(policy.IsActive);
            Assert.Equal(now, policy.CreatedAt);

            // 27. PolicyEvaluationResult
            var evalResult = new PolicyEvaluationResult("pol1", true, "violation");
            Assert.Equal("pol1", evalResult.PolicyId);
            Assert.True(evalResult.IsCompliant);
            Assert.Equal("violation", evalResult.ViolationReason);
        }
    }
}
