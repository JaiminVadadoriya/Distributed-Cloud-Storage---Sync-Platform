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
        public void ExtendedRecordTypes_ShouldInitializeCorrectly()
        {
            var now = DateTime.UtcNow;

            // NamespaceEntry
            var aliases = new Dictionary<string, string> { { "alias1", "path1" } };
            var ns = new NamespaceEntry("global", "tenant", "S3", "phys", "us-east-1", aliases);
            Assert.Equal("global", ns.GlobalPath);
            Assert.Equal("tenant", ns.TenantId);
            Assert.Equal("S3", ns.Provider);
            Assert.Equal("phys", ns.PhysicalKey);
            Assert.Equal("us-east-1", ns.Region);
            Assert.Equal(aliases, ns.Aliases);

            // ObjectMetadata
            var chunkHashes = new List<string> { "h1", "h2" };
            var tags = new Dictionary<string, string> { { "t1", "v1" } };
            var objMetaId = Guid.NewGuid();
            var objMeta = new ObjectMetadata(objMetaId, "key", 1024, "root", chunkHashes, "tenant", "Hot", tags, now);
            Assert.Equal(objMetaId, objMeta.ObjectId);
            Assert.Equal("key", objMeta.Key);
            Assert.Equal(1024, objMeta.Size);
            Assert.Equal("root", objMeta.RootHash);
            Assert.Equal(chunkHashes, objMeta.ChunkHashes);
            Assert.Equal("tenant", objMeta.TenantId);
            Assert.Equal("Hot", objMeta.CurrentTier);
            Assert.Equal(tags, objMeta.Tags);
            Assert.Equal(now, objMeta.LastModified);

            // RebalanceResult
            var rebalance = new RebalanceResult(5, 10, TimeSpan.FromSeconds(5), true);
            Assert.Equal(5, rebalance.PartitionsMoved);
            Assert.Equal(10, rebalance.ObjectsMigrated);
            Assert.Equal(TimeSpan.FromSeconds(5), rebalance.Duration);
            Assert.True(rebalance.Success);

            // PartitionInfo
            var partition = new PartitionInfo(1, "node1", 0, 100, 200);
            Assert.Equal(1, partition.PartitionId);
            Assert.Equal("node1", partition.NodeId);
            Assert.Equal(0, partition.VirtualNodeIndex);
            Assert.Equal(100U, partition.HashRangeStart);
            Assert.Equal(200U, partition.HashRangeEnd);

            // MerkleNode
            var rightNode = new MerkleNode("right", true);
            var leftNode = new MerkleNode("left", true);
            var parentNode = new MerkleNode("parent", false, leftNode, rightNode);
            Assert.Equal("parent", parentNode.Hash);
            Assert.False(parentNode.IsLeaf);
            Assert.Same(leftNode, parentNode.Left);
            Assert.Same(rightNode, parentNode.Right);

            // Identity DTOs
            var claims = new Dictionary<string, string> { { "sub", "123" } };
            var fedId = new FederatedIdentity("sub1", "tenant1", FederationProtocol.OIDC, "google", claims, now);
            Assert.Equal("sub1", fedId.SubjectId);
            Assert.Equal("tenant1", fedId.TenantId);
            Assert.Equal(FederationProtocol.OIDC, fedId.Protocol);
            Assert.Equal("google", fedId.Issuer);
            Assert.Equal(claims, fedId.Claims);
            Assert.Equal(now, fedId.AuthenticatedAt);

            var idProvider = new IdentityProviderConfig("provider1", "tenant1", FederationProtocol.SAML, "http://meta", "client1", true);
            Assert.Equal("provider1", idProvider.ProviderId);
            Assert.Equal("tenant1", idProvider.TenantId);
            Assert.Equal(FederationProtocol.SAML, idProvider.Protocol);
            Assert.Equal("http://meta", idProvider.MetadataUrl);
            Assert.Equal("client1", idProvider.ClientId);
            Assert.True(idProvider.IsActive);

            // Gateway Request / Response
            var headers = new Dictionary<string, string> { { "User-Agent", "Mozilla" } };
            var request = new GatewayRequest(GatewayProtocol.S3, "GET", "/file", new byte[] { 1 }, headers, "tenant1");
            Assert.Equal(GatewayProtocol.S3, request.Protocol);
            Assert.Equal("GET", request.Method);
            Assert.Equal("/file", request.Path);
            Assert.Equal(new byte[] { 1 }, request.Body);
            Assert.Equal(headers, request.Headers);
            Assert.Equal("tenant1", request.TenantId);

            var response = new GatewayResponse(200, new byte[] { 2 }, headers, "application/json");
            Assert.Equal(200, response.StatusCode);
            Assert.Equal(new byte[] { 2 }, response.Body);
            Assert.Equal(headers, response.Headers);
            Assert.Equal("application/json", response.ContentType);

            // StorageOperation
            var payload = new byte[] { 3 };
            var metadata = new Dictionary<string, string> { { "k", "v" } };
            var storageOp = new StorageOperation("PUT", "key", "/bucket/path", payload, metadata);
            Assert.Equal("PUT", storageOp.OperationType);
            Assert.Equal("key", storageOp.ObjectKey);
            Assert.Equal("/bucket/path", storageOp.BucketOrPath);
            Assert.Equal(payload, storageOp.Payload);
            Assert.Equal(metadata, storageOp.Metadata);

            // Fleet Node
            var fleetNode = new FleetNode("node1", NodeStatus.Active, "us-west", "1.0", now, 10.5, 20.5, 1024L);
            Assert.Equal("node1", fleetNode.NodeId);
            Assert.Equal(NodeStatus.Active, fleetNode.Status);
            Assert.Equal("us-west", fleetNode.Region);
            Assert.Equal("1.0", fleetNode.Version);
            Assert.Equal(now, fleetNode.LastHeartbeat);
            Assert.Equal(10.5, fleetNode.CpuUsage);
            Assert.Equal(20.5, fleetNode.MemoryUsage);
            Assert.Equal(1024L, fleetNode.StorageUsedBytes);

            // RollingUpgradeResult
            var upgradeResult = new RollingUpgradeResult(10, 1, TimeSpan.FromMinutes(2), "1.1");
            Assert.Equal(10, upgradeResult.NodesUpgraded);
            Assert.Equal(1, upgradeResult.NodesFailed);
            Assert.Equal(TimeSpan.FromMinutes(2), upgradeResult.Duration);
            Assert.Equal("1.1", upgradeResult.TargetVersion);

            // Durability DTOs
            var ECConfig = new ErasureCodingConfig(6, 3);
            Assert.Equal(6, ECConfig.DataShards);
            Assert.Equal(3, ECConfig.ParityShards);

            var dataBlocks = new byte[][] { new byte[] { 1 } };
            var parityBlocks = new byte[][] { new byte[] { 2 } };
            var ECObject = new ErasureCodedObject(dataBlocks, parityBlocks, ECConfig);
            Assert.Equal(dataBlocks, ECObject.DataBlocks);
            Assert.Equal(parityBlocks, ECObject.ParityBlocks);
            Assert.Same(ECConfig, ECObject.Config);

            var repair = new RepairResult("key", true, 2, TimeSpan.FromSeconds(3), "ErasureCoding");
            Assert.Equal("key", repair.ObjectKey);
            Assert.True(repair.Success);
            Assert.Equal(2, repair.ShardsReconstructed);
            Assert.Equal(TimeSpan.FromSeconds(3), repair.Duration);
            Assert.Equal("ErasureCoding", repair.Strategy);

            var durabilityReport = new DurabilityReport("key", 99.999, 3, 3, 6, 6, "ErasureCoding", false);
            Assert.Equal("key", durabilityReport.ObjectKey);
            Assert.Equal(99.999, durabilityReport.DurabilityScore);
            Assert.Equal(3, durabilityReport.HealthyReplicas);
            Assert.Equal(3, durabilityReport.TotalReplicas);
            Assert.Equal(6, durabilityReport.HealthyShards);
            Assert.Equal(6, durabilityReport.TotalShards);
            Assert.Equal("ErasureCoding", durabilityReport.Strategy);
            Assert.False(durabilityReport.NeedsRepair);

            // DR DR/DTOs
            var drMetrics = new DRMetrics(TimeSpan.FromHours(1), TimeSpan.FromHours(2), now, now, true);
            Assert.Equal(TimeSpan.FromHours(1), drMetrics.RecoveryPointObjective);
            Assert.Equal(TimeSpan.FromHours(2), drMetrics.RecoveryTimeObjective);
            Assert.Equal(now, drMetrics.LastBackup);
            Assert.Equal(now, drMetrics.LastDrillDate);
            Assert.True(drMetrics.DrillPassed);

            var drDrill = new DRDrillResult("drill1", true, TimeSpan.FromMinutes(10), TimeSpan.FromMinutes(5), 100, 0, "report");
            Assert.Equal("drill1", drDrill.DrillId);
            Assert.True(drDrill.Passed);
            Assert.Equal(TimeSpan.FromMinutes(10), drDrill.ActualRTO);
            Assert.Equal(TimeSpan.FromMinutes(5), drDrill.ActualRPO);
            Assert.Equal(100, drDrill.ObjectsRecovered);
            Assert.Equal(0, drDrill.ObjectsFailed);
            Assert.Equal("report", drDrill.Report);

            // Cost DTO
            var cost = new CostForecast(100.0, 150.0, 50.0, 20.0);
            Assert.Equal(100.0, cost.S3Cost);
            Assert.Equal(150.0, cost.AzureCost);
            Assert.Equal(50.0, cost.MinIoCost);
            Assert.Equal(20.0, cost.RecommendedSavings);

            // Compliance DTOs
            var complianceControl = new ComplianceControl("c1", ComplianceStandard.GDPR, "RightToForget", "Delete user data", true, "logs");
            Assert.Equal("c1", complianceControl.ControlId);
            Assert.Equal(ComplianceStandard.GDPR, complianceControl.Standard);
            Assert.Equal("RightToForget", complianceControl.Name);
            Assert.Equal("Delete user data", complianceControl.Description);
            Assert.True(complianceControl.IsImplemented);
            Assert.Equal("logs", complianceControl.Evidence);

            var complianceReport = new ComplianceReport(ComplianceStandard.SOC2, new List<ComplianceControl> { complianceControl }, 100.0, now);
            Assert.Equal(ComplianceStandard.SOC2, complianceReport.Standard);
            Assert.Contains(complianceControl, complianceReport.Controls);
            Assert.Equal(100.0, complianceReport.CompliancePercentage);
            Assert.Equal(now, complianceReport.GeneratedAt);

            // CDC DTOs
            var cdcChunk = new ChunkBoundaryOptions(1024, 4096, 2048);
            Assert.Equal(1024, cdcChunk.MinChunkSize);
            Assert.Equal(4096, cdcChunk.MaxChunkSize);
            Assert.Equal(2048, cdcChunk.AverageChunkSize);

            var dedupMetrics = new DeduplicationMetrics(2048, 1024, 2.0, 4);
            Assert.Equal(2048, dedupMetrics.OriginalSize);
            Assert.Equal(1024, dedupMetrics.DeduplicatedSize);
            Assert.Equal(2.0, dedupMetrics.Ratio);
            Assert.Equal(4, dedupMetrics.ChunkCount);

            // Billing DTOs
            var usage = new UsageMeter("tenant1", 1000L, 5000L, 2000L, 50, now, now.AddDays(30));
            Assert.Equal("tenant1", usage.TenantId);
            Assert.Equal(1000L, usage.StorageBytes);
            Assert.Equal(5000L, usage.EgressBytes);
            Assert.Equal(2000L, usage.IngressBytes);
            Assert.Equal(50, usage.ApiCalls);
            Assert.Equal(now, usage.PeriodStart);
            Assert.Equal(now.AddDays(30), usage.PeriodEnd);

            var billingInvoice = new BillingInvoice("inv1", "tenant1", 250.0m, 200.0m, 50.0m, 0.0m, usage, now);
            Assert.Equal("inv1", billingInvoice.InvoiceId);
            Assert.Equal("tenant1", billingInvoice.TenantId);
            Assert.Equal(200.0m, billingInvoice.StorageCost);
            Assert.Equal(50.0m, billingInvoice.EgressCost);
            Assert.Equal(250.0m, billingInvoice.TotalCost);
            Assert.Same(usage, billingInvoice.Usage);
            Assert.Equal(now, billingInvoice.GeneratedAt);

            // Benchmarks DTO
            var benchmark = new BenchmarkResult("write", 50.5, 120.0, 250.0, 1000, TimeSpan.FromSeconds(5), true);
            Assert.Equal("write", benchmark.TestName);
            Assert.Equal(50.5, benchmark.ThroughputMBps);
            Assert.Equal(120.0, benchmark.LatencyP50Ms);
            Assert.Equal(250.0, benchmark.LatencyP99Ms);
            Assert.Equal(1000, benchmark.ObjectsTested);
            Assert.Equal(TimeSpan.FromSeconds(5), benchmark.Duration);
            Assert.True(benchmark.PassedSLA);
        }
    }
}
