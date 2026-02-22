using System;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class AzureChunkVerificationServiceTests
    {
        private readonly Mock<IBlobSasService> _mockSasService;
        private readonly Mock<ILogger<AzureChunkVerificationService>> _mockLogger;
        private readonly AzureChunkVerificationService _service;

        public AzureChunkVerificationServiceTests()
        {
            _mockSasService = new Mock<IBlobSasService>();
            _mockLogger = new Mock<ILogger<AzureChunkVerificationService>>();
            _service = new AzureChunkVerificationService(_mockSasService.Object, _mockLogger.Object);
        }

        [Fact]
        public async Task VerifyAllChunksAsync_ReturnsValid_WhenAllChunksExist()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkCount = 3;

            _mockSasService.Setup(x => x.ChunkBlobExistsAsync(It.IsAny<string>()))
                .ReturnsAsync(true); // All exist

            // Act
            var result = await _service.VerifyAllChunksAsync(fileId, chunkCount);

            // Assert
            Assert.True(result.IsValid);
            Assert.Empty(result.MissingChunkIndices);
            
            // Verify that ChunkBlobExistsAsync was called exactly chunkCount times
            for (var i = 0; i < chunkCount; i++)
            {
                var expectedBlobName = $"{fileId}/{i}.chunk";
                _mockSasService.Verify(x => x.ChunkBlobExistsAsync(expectedBlobName), Times.Once);
            }
        }

        [Fact]
        public async Task VerifyAllChunksAsync_ReturnsInvalid_WhenSomeChunksAreMissing()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkCount = 5;

            // Chunks 1 and 3 are missing
            _mockSasService.Setup(x => x.ChunkBlobExistsAsync($"{fileId}/0.chunk")).ReturnsAsync(true);
            _mockSasService.Setup(x => x.ChunkBlobExistsAsync($"{fileId}/1.chunk")).ReturnsAsync(false);
            _mockSasService.Setup(x => x.ChunkBlobExistsAsync($"{fileId}/2.chunk")).ReturnsAsync(true);
            _mockSasService.Setup(x => x.ChunkBlobExistsAsync($"{fileId}/3.chunk")).ReturnsAsync(false);
            _mockSasService.Setup(x => x.ChunkBlobExistsAsync($"{fileId}/4.chunk")).ReturnsAsync(true);

            // Act
            var result = await _service.VerifyAllChunksAsync(fileId, chunkCount);

            // Assert
            Assert.False(result.IsValid);
            Assert.Equal(2, result.MissingChunkIndices.Count());
            Assert.Contains(1, result.MissingChunkIndices);
            Assert.Contains(3, result.MissingChunkIndices);
        }
    }
}
