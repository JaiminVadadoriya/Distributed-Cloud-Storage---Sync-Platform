using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Consensus;
using CloudStorage.Application.Interfaces.Metadata;
using CloudStorage.Infrastructure.Consensus;
using CloudStorage.Infrastructure.Metadata;
using CloudStorage.Infrastructure.Search;
using Moq;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public partial class HyperscaleOrchestrationTests
    {
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
            using var stream = new System.IO.MemoryStream(System.Text.Encoding.UTF8.GetBytes(text));

            await pipeline.ProcessDocumentAsync("doc.txt", "tenant-1", stream);

            Assert.True(ElasticSearchService.ExtractedTexts.ContainsKey("tenant-1:doc.txt"));
            Assert.Equal(text, ElasticSearchService.ExtractedTexts["tenant-1:doc.txt"]);
        }

        #endregion
    }
}
