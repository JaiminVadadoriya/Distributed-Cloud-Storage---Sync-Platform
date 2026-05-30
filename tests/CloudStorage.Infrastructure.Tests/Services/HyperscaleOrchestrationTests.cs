using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.AI;
using CloudStorage.Application.Interfaces.CDC;
using CloudStorage.Application.Interfaces.Chaos;
using CloudStorage.Application.Interfaces.Consensus;
using CloudStorage.Application.Interfaces.Cost;
using CloudStorage.Application.Interfaces.Edge;
using CloudStorage.Application.Interfaces.Metadata;
using CloudStorage.Application.Interfaces.Merkle;
using CloudStorage.Application.Interfaces.SaaS;
using CloudStorage.Application.Interfaces.Search;
using CloudStorage.Application.Interfaces.Security;
using CloudStorage.Application.Interfaces.Sla;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.CDC;
using CloudStorage.Infrastructure.Consensus;
using CloudStorage.Infrastructure.Cost;
using CloudStorage.Infrastructure.Edge;
using CloudStorage.Infrastructure.Metadata;
using CloudStorage.Infrastructure.Merkle;
using CloudStorage.Infrastructure.SaaS;
using CloudStorage.Infrastructure.Search;
using CloudStorage.Infrastructure.Security;
using CloudStorage.Infrastructure.AI;
using CloudStorage.Infrastructure.Sla;
using CloudStorage.Infrastructure.Chaos;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class HyperscaleOrchestrationTests : IDisposable
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly Mock<ICacheService> _mockCache;
        private readonly Mock<IMetadataIndexer> _mockIndexer;
        private readonly Mock<IStorageIntelligenceService> _mockAi;

        public HyperscaleOrchestrationTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _dbContext = new ApplicationDbContext(options);
            _mockCache = new Mock<ICacheService>();
            _mockIndexer = new Mock<IMetadataIndexer>();
            _mockAi = new Mock<IStorageIntelligenceService>();

            // Setup default mocks
            _mockCache.Setup(c => c.GetAsync<ObjectMetadata>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((ObjectMetadata?)null);
            _mockCache.Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<ObjectMetadata>(), It.IsAny<TimeSpan?>(), It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            _mockIndexer.Setup(i => i.IndexAsync(It.IsAny<ObjectMetadata>())).Returns(Task.CompletedTask);
            _mockIndexer.Setup(i => i.DeindexAsync(It.IsAny<string>(), It.IsAny<string>())).Returns(Task.CompletedTask);
            
            _mockAi.Setup(a => a.GenerateEmbeddingsAsync(It.IsAny<string>())).ReturnsAsync(new float[128]);
        }

        public void Dispose()
        {
            _dbContext.Database.EnsureDeleted();
            _dbContext.Dispose();
        }

        #region 1. CDC & Deduplication Tests

        [Fact]
        public void FastCdcChunkBoundaryDetector_IsBoundary_ReturnsExpectedValues()
        {
            var detector = new FastCdcChunkBoundaryDetector();
            var window = new byte[48];
            var isBoundary = detector.IsBoundary(window, 0, 1); // 1 & 0x1FFF != 0, should be false
            Assert.False(isBoundary);
        }

        [Fact]
        public async Task ContentDefinedChunker_SplitStreamAsync_GeneratesVariableSizeChunks()
        {
            var chunker = new ContentDefinedChunker();

            // Generate some repeating data that splits at boundaries
            var data = new byte[1024 * 1024]; // 1MB
            var rnd = new Random(42);
            rnd.NextBytes(data);

            using var stream = new MemoryStream(data);
            var options = new ChunkBoundaryOptions(16384, 131072, 65536); // 16KB min, 128KB max, 64KB avg

            var chunks = new List<byte[]>();
            await foreach (var chunk in chunker.SplitStreamAsync(stream, options))
            {
                chunks.Add(chunk);
            }

            Assert.NotEmpty(chunks);
            Assert.True(chunks.Count > 1);
            Assert.All(chunks, c => Assert.True(c.Length >= 16384 && c.Length <= 131072));
        }

        [Fact]
        public async Task DeduplicationOptimizer_AnalyzeSavingsAsync_ComputesCorrectMetrics()
        {
            var chunker = new ContentDefinedChunker();
            var optimizer = new DeduplicationOptimizer(chunker);
            var data = Encoding.UTF8.GetBytes(string.Concat(Enumerable.Repeat("Hello World! Storage Deduplication Testing. ", 5000)));

            var result = await optimizer.AnalyzeSavingsAsync("test-file", data);

            Assert.NotNull(result);
            Assert.Equal(data.Length, result.OriginalSize);
            Assert.True(result.DeduplicatedSize <= result.OriginalSize);
            Assert.True(result.Ratio <= 1.0);
        }

        #endregion

        #region 2. Merkle Tree Integrity Tests

        [Fact]
        public void MerkleTreeService_BuildTree_EmptyList_ReturnsDefaultHashNode()
        {
            var service = new MerkleTreeService();
            var root = service.BuildTree(new List<string>());

            Assert.NotNull(root);
            Assert.True(root.IsLeaf);
            Assert.NotEmpty(root.Hash);
        }

        [Fact]
        public void MerkleTreeService_BuildTree_SingleHash_ReturnsLeafRoot()
        {
            var service = new MerkleTreeService();
            var hashes = new List<string> { "chunk1" };
            var root = service.BuildTree(hashes);

            Assert.NotNull(root);
            Assert.True(root.IsLeaf);
            Assert.Equal("chunk1", root.Hash);
        }

        [Fact]
        public void MerkleTreeService_BuildTree_MultipleHashes_ConstructsCorrectTree()
        {
            var service = new MerkleTreeService();
            var hashes = new List<string> { "h1", "h2", "h3" }; // Odd count to test duplication logic
            var root = service.BuildTree(hashes);

            Assert.NotNull(root);
            Assert.False(root.IsLeaf);
            Assert.NotNull(root.Left);
            Assert.NotNull(root.Right);
        }

        [Fact]
        public void MerkleTreeService_GetAuditProof_ReturnsCorrectSiblingHashes()
        {
            var service = new MerkleTreeService();
            var hashes = new List<string> { "h1", "h2", "h3", "h4" };
            var root = service.BuildTree(hashes);

            var proof = service.GetAuditProof(root, "h2", 1);

            Assert.NotNull(proof);
            Assert.Equal(2, proof.Count);
            Assert.Equal("h1", proof[0]); // Sibling of h2 at bottom level is h1
        }

        [Fact]
        public void MerkleVerifier_VerifyProof_ValidProof_ReturnsTrue()
        {
            var treeService = new MerkleTreeService();
            var hashes = new List<string> { "h1", "h2", "h3", "h4" };
            var root = treeService.BuildTree(hashes);

            var proof = treeService.GetAuditProof(root, "h2", 1);
            var verifier = new MerkleVerifier();

            var isValid = verifier.VerifyProof(root.Hash, "h2", 1, proof);
            Assert.True(isValid);
        }

        [Fact]
        public void MerkleVerifier_VerifyProof_InvalidProof_ReturnsFalse()
        {
            var treeService = new MerkleTreeService();
            var hashes = new List<string> { "h1", "h2", "h3", "h4" };
            var root = treeService.BuildTree(hashes);

            var proof = new List<string> { "wrong_sibling", "another_wrong" };
            var verifier = new MerkleVerifier();

            var isValid = verifier.VerifyProof(root.Hash, "h2", 1, proof);
            Assert.False(isValid);
        }

        [Fact]
        public void MerkleVerifier_LocalizeCorruption_NoCorruption_ReturnsEmpty()
        {
            var treeService = new MerkleTreeService();
            var hashes = new List<string> { "h1", "h2", "h3", "h4" };
            var root = treeService.BuildTree(hashes);

            var verifier = new MerkleVerifier();
            var corrupt = verifier.LocalizeCorruption(root, root.Hash);

            Assert.Empty(corrupt);
        }

        [Fact]
        public void MerkleVerifier_LocalizeCorruption_WithCorruption_LocatesCorrectLeaf()
        {
            var treeService = new MerkleTreeService();
            var hashesLocal = new List<string> { "h1", "h2", "h3", "h4" };
            var localRoot = treeService.BuildTree(hashesLocal);

            // Create corrupted remote tree
            var hashesRemote = new List<string> { "h1", "corrupt_h2", "h3", "h4" };
            var remoteRoot = treeService.BuildTree(hashesRemote);

            var verifier = new MerkleVerifier();
            var corruptIndices = verifier.LocalizeCorruption(localRoot, remoteRoot.Hash);

            Assert.Single(corruptIndices);
            Assert.Equal(1, corruptIndices[0]); // h2 is at index 1
        }

        #endregion

        #region 3. Cluster Consensus & Leadership Tests

        [Fact]
        public async Task LeaderElectionService_TryAcquireLeadership_ClaimsLeadership()
        {
            var electionService = new LeaderElectionService(redis: null); // Fallback to in-memory mode
            var node1Acquired = await electionService.TryAcquireLeadershipAsync("node-1");
            Assert.True(node1Acquired);

            var leader = await electionService.GetCurrentLeaderAsync();
            Assert.Equal("node-1", leader);
        }

        [Fact]
        public async Task LeaderElectionService_TryAcquireLeadership_AlreadyLeader_RenewsLease()
        {
            var electionService = new LeaderElectionService(redis: null);
            await electionService.TryAcquireLeadershipAsync("node-1");

            var renew = await electionService.TryAcquireLeadershipAsync("node-1");
            Assert.True(renew);
        }

        [Fact]
        public async Task LeaderElectionService_TryAcquireLeadership_OtherNodeIsLeader_Fails()
        {
            var electionService = new LeaderElectionService(redis: null);
            await electionService.TryAcquireLeadershipAsync("node-1");

            var node2Acquired = await electionService.TryAcquireLeadershipAsync("node-2");
            Assert.False(node2Acquired);
        }

        [Fact]
        public async Task LeaderElectionService_ReleaseLeadership_ReleaseOnlyIfMatches()
        {
            var electionService = new LeaderElectionService(redis: null);
            await electionService.TryAcquireLeadershipAsync("node-1");

            await electionService.ReleaseLeadershipAsync("node-2"); // Attempt wrong release
            var leaderBefore = await electionService.GetCurrentLeaderAsync();
            Assert.Equal("node-1", leaderBefore);

            await electionService.ReleaseLeadershipAsync("node-1"); // Release correct
            var leaderAfter = await electionService.GetCurrentLeaderAsync();
            Assert.Null(leaderAfter);
        }

        [Fact]
        public async Task ConsensusService_ProposeStateChange_QuorumReached_Succeeds()
        {
            var electionService = new LeaderElectionService(redis: null);
            await electionService.TryAcquireLeadershipAsync("node-1"); // node-1 is leader
            
            var consensusService = new ConsensusService(electionService);

            // Re-enable health for all nodes
            ConsensusService.NodeHealth["node-1"] = true;
            ConsensusService.NodeHealth["node-2"] = true;
            ConsensusService.NodeHealth["node-3"] = true;

            var proposed = await consensusService.ProposeStateChangeAsync("cluster_config", "v1");
            Assert.True(proposed);

            var committed = await consensusService.GetConsensusStateAsync("cluster_config");
            Assert.Equal("v1", committed);
        }

        [Fact]
        public async Task ConsensusService_ProposeStateChange_PartitionedLeader_Fails()
        {
            var electionService = new LeaderElectionService(redis: null);
            await electionService.TryAcquireLeadershipAsync("node-1");
            
            var consensusService = new ConsensusService(electionService);

            // Simulate partitioned leader
            ConsensusService.NodeHealth["node-1"] = false;

            var proposed = await consensusService.ProposeStateChangeAsync("cluster_config", "v2");
            Assert.False(proposed);
        }

        [Fact]
        public async Task ConsensusService_ProposeStateChange_NoQuorum_Fails()
        {
            var electionService = new LeaderElectionService(redis: null);
            await electionService.TryAcquireLeadershipAsync("node-1");
            
            var consensusService = new ConsensusService(electionService);

            // Partition 2 of 3 nodes so only 1 healthy (no majority possible)
            ConsensusService.NodeHealth["node-1"] = true;
            ConsensusService.NodeHealth["node-2"] = false;
            ConsensusService.NodeHealth["node-3"] = false;

            var proposed = await consensusService.ProposeStateChangeAsync("cluster_config", "v3");
            Assert.False(proposed);
        }

        #endregion

        #region 4. Metadata Catalog Service Tests

        [Fact]
        public async Task MetadataService_CreateObject_SavesToDbAndCacheAndIndexer()
        {
            var repo = new MetadataRepository(_dbContext);
            var service = new MetadataService(repo, _mockCache.Object, _mockIndexer.Object);

            var metadata = new ObjectMetadata(
                Guid.NewGuid(),
                "file.pdf",
                500000,
                "some-root-hash",
                new List<string> { "chunk-1" },
                "tenant-1",
                "Hot",
                new Dictionary<string, string>(),
                DateTime.UtcNow
            );

            await service.CreateObjectAsync(metadata);

            var result = await service.GetObjectAsync("file.pdf", "tenant-1");
            Assert.NotNull(result);
            Assert.Equal("file.pdf", result.Key);

            _mockCache.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<ObjectMetadata>(), It.IsAny<TimeSpan?>(), It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
            _mockIndexer.Verify(i => i.IndexAsync(It.IsAny<ObjectMetadata>()), Times.Once);
        }

        [Fact]
        public async Task MetadataService_UpdateObjectTier_ModifiesTierAndSaves()
        {
            var repo = new MetadataRepository(_dbContext);
            var service = new MetadataService(repo, _mockCache.Object, _mockIndexer.Object);

            var metadata = new ObjectMetadata(
                Guid.NewGuid(),
                "file.pdf",
                500000,
                "some-root-hash",
                new List<string> { "chunk-1" },
                "tenant-1",
                "Hot",
                new Dictionary<string, string>(),
                DateTime.UtcNow
            );

            await service.CreateObjectAsync(metadata);

            // Update tier to Cool
            await service.UpdateObjectTierAsync("file.pdf", "Cool", "tenant-1");

            var updated = await service.GetObjectAsync("file.pdf", "tenant-1");
            Assert.NotNull(updated);
            Assert.Equal("Cool", updated.CurrentTier);
        }

        [Fact]
        public async Task MetadataService_DeleteObject_RemovesFromDbAndCache()
        {
            var repo = new MetadataRepository(_dbContext);
            var service = new MetadataService(repo, _mockCache.Object, _mockIndexer.Object);

            var metadata = new ObjectMetadata(
                Guid.NewGuid(),
                "file.pdf",
                500000,
                "some-root-hash",
                new List<string> { "chunk-1" },
                "tenant-1",
                "Hot",
                new Dictionary<string, string>(),
                DateTime.UtcNow
            );

            await service.CreateObjectAsync(metadata);
            await service.DeleteObjectAsync("file.pdf", "tenant-1");

            var result = await service.GetObjectAsync("file.pdf", "tenant-1");
            Assert.Null(result);

            _mockCache.Verify(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
            _mockIndexer.Verify(i => i.DeindexAsync("file.pdf", "tenant-1"), Times.Once);
        }

        #endregion

        #region 5. Search & Indexing Platform Tests

        [Fact]
        public async Task ElasticSearchService_Search_ReturnsRelevanceMatches()
        {
            var elasticSearch = new ElasticSearchService();
            var meta1 = new ObjectMetadata(Guid.NewGuid(), "contract_final.pdf", 100, "hash", new List<string>(), "tenant-1", "Hot", new Dictionary<string, string> { { "Type", "legal" } }, DateTime.UtcNow);
            var meta2 = new ObjectMetadata(Guid.NewGuid(), "photo.jpg", 200, "hash", new List<string>(), "tenant-1", "Hot", new Dictionary<string, string>(), DateTime.UtcNow);

            await elasticSearch.IndexAsync(meta1);
            await elasticSearch.IndexAsync(meta2);

            var results = await elasticSearch.SearchAsync("contract", "tenant-1");

            Assert.Single(results);
            Assert.Equal("contract_final.pdf", results[0].Key);
        }

        [Fact]
        public async Task ElasticSearchService_SemanticSearch_CosineSimilaritySortsCorrectly()
        {
            var elasticSearch = new ElasticSearchService();
            var meta1 = new ObjectMetadata(Guid.NewGuid(), "doc-1", 100, "hash", new List<string>(), "tenant-1", "Hot", new Dictionary<string, string>(), DateTime.UtcNow);
            
            await elasticSearch.IndexAsync(meta1);

            // Register document vector embeddings
            var docVector = new float[128];
            docVector[0] = 1.0f; // Unit vector on dim 0
            ElasticSearchService.Embeddings["tenant-1:doc-1"] = docVector;

            var queryVector = new float[128];
            queryVector[0] = 0.9f;
            queryVector[1] = 0.1f; // Close vector

            var results = await elasticSearch.SemanticSearchAsync(queryVector, "tenant-1");

            Assert.Single(results);
            Assert.Equal("doc-1", results[0].Key);
            Assert.True(results[0].Score > 80.0); // High score for similar vectors
        }

        [Fact]
        public async Task IndexingPipeline_ProcessDocument_ExtractsTextAndGeneratesEmbedding()
        {
            var pipeline = new IndexingPipeline(_mockAi.Object);
            var text = "Storage Platform Architecture details.";
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(text));

            await pipeline.ProcessDocumentAsync("doc.txt", "tenant-1", stream);

            Assert.True(ElasticSearchService.ExtractedTexts.ContainsKey("tenant-1:doc.txt"));
            Assert.Equal(text, ElasticSearchService.ExtractedTexts["tenant-1:doc.txt"]);
        }

        #endregion

        #region 6. Security & Key Management Tests

        [Fact]
        public async Task ClientEncryptionService_EncryptAndDecrypt_Succeeds()
        {
            var service = new ClientEncryptionService();
            var plaintext = Encoding.UTF8.GetBytes("Super secret data payload!");
            var secret = "my-shared-secret-123456";

            var encrypted = await service.EncryptClientSideAsync(plaintext, secret);
            Assert.NotEqual(plaintext, encrypted);

            var decrypted = await service.DecryptClientSideAsync(encrypted, secret);
            var decryptedStr = Encoding.UTF8.GetString(decrypted);

            Assert.Equal("Super secret data payload!", decryptedStr);
        }

        [Fact]
        public async Task ClientEncryptionService_Decrypt_WithWrongKey_ThrowsException()
        {
            var service = new ClientEncryptionService();
            var plaintext = Encoding.UTF8.GetBytes("Secret data");
            var secret = "secret-1";

            var encrypted = await service.EncryptClientSideAsync(plaintext, secret);

            await Assert.ThrowsAnyAsync<Exception>(() => service.DecryptClientSideAsync(encrypted, "wrong-secret"));
        }

        [Fact]
        public async Task KeyHierarchyManager_DeriveTenantKey_GeneratesDeterministicKey()
        {
            var manager = new KeyHierarchyManager();
            var masterKey = "master-key-12345-secret-bytes";
            
            var key1 = await manager.DeriveTenantKeyAsync(masterKey, "tenant-a");
            var key2 = await manager.DeriveTenantKeyAsync(masterKey, "tenant-a");
            var keyDifferent = await manager.DeriveTenantKeyAsync(masterKey, "tenant-b");

            Assert.Equal(key1, key2);
            Assert.NotEqual(key1, keyDifferent);
        }

        [Fact]
        public async Task KeyHierarchyManager_DeriveUserKey_GeneratesDeterministicKey()
        {
            var manager = new KeyHierarchyManager();
            var tenantKey = "derived-tenant-key-signature-hex";
            
            var userKey1 = await manager.DeriveUserKeyAsync(tenantKey, "user-1");
            var userKey2 = await manager.DeriveUserKeyAsync(tenantKey, "user-1");

            Assert.Equal(userKey1, userKey2);
        }

        #endregion

        #region 7. SaaS & Tenant Isolation Tests

        [Fact]
        public async Task TenantService_ValidateQuota_RespectsLimits()
        {
            var service = new TenantService();
            var config = new TenantConfig("tenant-a", 1000, "key-1", "s3");
            await service.CreateTenantAsync(config);

            var allowed = await service.ValidateQuotaAsync("tenant-a", 600);
            Assert.True(allowed);

            TenantService.RecordUsage("tenant-a", 600);

            var allowedOverLimit = await service.ValidateQuotaAsync("tenant-a", 500); // 600 + 500 = 1100 > 1000
            Assert.False(allowedOverLimit);
        }

        [Fact]
        public async Task TenantService_ValidateQuota_UnregisteredTenant_AllowsByFallback()
        {
            var service = new TenantService();
            var allowed = await service.ValidateQuotaAsync("unregistered", 999999);
            Assert.True(allowed); // Allows by default fallback
        }

        [Fact]
        public void TenantIsolationProvider_GetCurrentTenantId_ReturnsDefaultOrContextId()
        {
            var provider = new TenantIsolationProvider();
            var id = provider.GetCurrentTenantId();
            Assert.Equal("tenant-default", id);

            TenantIsolationProvider.SetCurrentTenantId("enterprise-1");
            var updatedId = provider.GetCurrentTenantId();
            Assert.Equal("enterprise-1", updatedId);
            
            TenantIsolationProvider.Clear();
        }

        #endregion

        #region 8. Cost Optimization Tests

        [Fact]
        public async Task CostOptimizationEngine_ForecastMonthlyCosts_ReturnsCorrectCalculations()
        {
            var engine = new CostOptimizationEngine(_dbContext);

            // Populate database with 10 GB metadata
            long size10GB = 10L * 1024 * 1024 * 1024;
            var meta = new DbObjectMetadata
            {
                Key = "huge-file.iso",
                TenantId = "tenant-cost",
                Size = size10GB,
                RootHash = "hash",
                CurrentTier = "Hot",
                LastModified = DateTime.UtcNow
            };
            await _dbContext.ObjectMetadata.AddAsync(meta);
            await _dbContext.SaveChangesAsync();

            var forecast = await engine.ForecastMonthlyCostsAsync("tenant-cost");

            Assert.Equal(10.0 * 0.023, forecast.S3Cost, 3);
            Assert.Equal(10.0 * 0.018, forecast.AzureCost, 3);
            Assert.Equal(10.0 * 0.005, forecast.MinIoCost, 3);
        }

        [Fact]
        public async Task CostOptimizationEngine_GenerateTieringRecommendations_IdentifiesIdleFiles()
        {
            var engine = new CostOptimizationEngine(_dbContext);

            var oldMeta = new DbObjectMetadata
            {
                Key = "old-backups.zip",
                TenantId = "tenant-old",
                Size = 1024 * 1024 * 1024,
                RootHash = "hash",
                CurrentTier = "Hot",
                LastModified = DateTime.UtcNow.AddDays(-40) // older than 30 days
            };
            await _dbContext.ObjectMetadata.AddAsync(oldMeta);
            await _dbContext.SaveChangesAsync();

            var recommendations = await engine.GenerateTieringRecommendationsAsync("tenant-old");

            Assert.Single(recommendations);
            Assert.Contains("Recommend moving from Hot to Cool tier", recommendations[0]);
        }

        #endregion

        #region 9. AI Storage Intelligence Tests

        [Fact]
        public async Task StorageIntelligenceService_ClassifyContent_IdentifiesMimeClasses()
        {
            var service = new StorageIntelligenceService(_dbContext);
            
            var c1 = await service.ClassifyContentAsync("report.pdf", Array.Empty<byte>());
            var c2 = await service.ClassifyContentAsync("photo.jpeg", Array.Empty<byte>());
            var c3 = await service.ClassifyContentAsync("build.js", Array.Empty<byte>());

            Assert.Equal("Documents", c1);
            Assert.Equal("Media", c2);
            Assert.Equal("Source Code", c3);
        }

        [Fact]
        public async Task StorageIntelligenceService_GenerateEmbeddings_ReturnsNormalizedVector()
        {
            var service = new StorageIntelligenceService(_dbContext);
            var vector = await service.GenerateEmbeddingsAsync("semantic segment");

            Assert.Equal(128, vector.Length);

            // Validate unit length normalization (magnitude should be very close to 1)
            double magnitudeSum = vector.Sum(v => v * v);
            Assert.Equal(1.0, magnitudeSum, 4);
        }

        [Fact]
        public async Task StorageIntelligenceService_DetectDuplicate_IdentifiesExistingHashes()
        {
            var service = new StorageIntelligenceService(_dbContext);
            
            var meta = new DbObjectMetadata
            {
                Key = "original.txt",
                TenantId = "tenant-1",
                Size = 10,
                RootHash = "aaaaaabbbbbbcccccc",
                CurrentTier = "Hot",
                LastModified = DateTime.UtcNow
            };
            await _dbContext.ObjectMetadata.AddAsync(meta);
            await _dbContext.SaveChangesAsync();

            var hashBytes = Convert.FromHexString("aaaaaabbbbbbcccccc");
            var duplicateDetected = await service.DetectDuplicateAsync("copy.txt", hashBytes);

            Assert.True(duplicateDetected);
        }

        #endregion

        #region 10. Edge CDN Routing Tests

        [Fact]
        public async Task EdgeDistributionService_GetGeoRoutedUrl_ResolvesCorrectEdge()
        {
            var service = new EdgeDistributionService();
            
            var urlUS = await service.GetGeoRoutedUrlAsync("doc.pdf", "8.8.8.8");
            var urlEU = await service.GetGeoRoutedUrlAsync("doc.pdf", "82.165.1.1");
            var urlLocal = await service.GetGeoRoutedUrlAsync("doc.pdf", "192.168.1.5");

            Assert.Contains("cdn-eu-west.cloudstorage.net", urlEU);
            Assert.Contains("cdn-lan-local.cloudstorage.net", urlLocal);
        }

        [Fact]
        public async Task EdgeDistributionService_GenerateSignedCdnUrl_GeneratesValidHMAC()
        {
            var service = new EdgeDistributionService();
            var signedUrl = await service.GenerateSignedCdnUrlAsync("report.pdf", TimeSpan.FromMinutes(10));

            Assert.NotEmpty(signedUrl);
            Assert.Contains("sig=", signedUrl);
            Assert.Contains("exp=", signedUrl);
        }

        #endregion

        #region 11. SLO Telemetry & Chaos Engineering Tests

        [Fact]
        public async Task SloMonitoringService_RecordMetrics_CalculatesCorrectAvailability()
        {
            var service = new SloMonitoringService();
            
            await service.RecordRequestMetricsAsync("s3", true, 50.0);
            await service.RecordRequestMetricsAsync("s3", true, 60.0);
            await service.RecordRequestMetricsAsync("s3", false, 120.0); // 1 failure out of 3

            var report = await service.GenerateSloReportAsync("s3");

            Assert.Equal(66.6666, report.AvailabilityPercentage, 2);
            Assert.Equal(76.6666, report.AverageLatencyMs, 2);
            Assert.True(report.ErrorBudgetUsed > 100.0); // exceeded the 99.9% target by far
        }

        [Fact]
        public async Task ChaosTestingService_SimulateFault_ThrowsFaultWhenEnabled()
        {
            var service = new ChaosTestingService();
            service.EnableChaos("gcp", 1.0, 0); // 100% failure rate

            await Assert.ThrowsAsync<InvalidOperationException>(() => service.SimulateFaultIfEnabledAsync("gcp"));

            service.DisableChaos("gcp");
            
            // Should not throw now
            var exception = await Record.ExceptionAsync(() => service.SimulateFaultIfEnabledAsync("gcp"));
            Assert.Null(exception);
        }

        #endregion
    }
}
