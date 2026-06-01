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
    public partial class HyperscaleOrchestrationTests : IDisposable
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
    }
}
