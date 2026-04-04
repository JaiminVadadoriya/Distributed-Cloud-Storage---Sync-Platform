using System;
using System.Threading.Tasks;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using CloudStorage.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class BlobSasServiceTests
    {
        private readonly Mock<BlobServiceClient> _mockBlobServiceClient;
        private readonly Mock<BlobContainerClient> _mockContainerClient;
        private readonly Mock<BlobClient> _mockBlobClient;
        private readonly Mock<IConfiguration> _mockConfig;
        private readonly BlobSasService _service;

        public BlobSasServiceTests()
        {
            _mockBlobServiceClient = new Mock<BlobServiceClient>();
            _mockContainerClient = new Mock<BlobContainerClient>();
            _mockBlobClient = new Mock<BlobClient>();
            _mockConfig = new Mock<IConfiguration>();

            // Setup Configuration
            var configSection = new Mock<IConfigurationSection>();
            configSection.Setup(x => x.Value).Returns("test-container");

            var configExpiry = new Mock<IConfigurationSection>();
            configExpiry.Setup(x => x.Value).Returns("30");

            _mockConfig.Setup(c => c.GetSection("AzureBlob:ContainerName")).Returns(configSection.Object);
            _mockConfig.Setup(c => c.GetSection("AzureBlob:SasTokenExpiryMinutes")).Returns(configExpiry.Object);
            // also mock indexer
            _mockConfig.Setup(c => c["AzureBlob:ContainerName"]).Returns("test-container");
            _mockConfig.Setup(c => c["AzureBlob:SasTokenExpiryMinutes"]).Returns("30");

            // Setup Azure Client Hierarchy
            _mockBlobServiceClient
                .Setup(x => x.GetBlobContainerClient(It.IsAny<string>()))
                .Returns(_mockContainerClient.Object);

            _mockContainerClient
                .Setup(x => x.CreateIfNotExistsAsync(It.IsAny<PublicAccessType>(), It.IsAny<System.Collections.Generic.IDictionary<string, string>>(), It.IsAny<BlobContainerEncryptionScopeOptions>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(Response.FromValue((BlobContainerInfo)null!, null!)); // Mock CreateIfNotExistsAsync

            _mockContainerClient
                .Setup(x => x.GetBlobClient(It.IsAny<string>()))
                .Returns(_mockBlobClient.Object);

            _service = new BlobSasService(_mockBlobServiceClient.Object, _mockConfig.Object);
        }

        [Fact]
        public async Task ChunkBlobExistsAsync_ReturnsTrue_WhenBlobExists()
        {
            // Arrange
            _mockBlobClient.Setup(x => x.ExistsAsync(It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(Response.FromValue(true, null!));

            // Act
            var result = await _service.ChunkBlobExistsAsync("test-blob.chunk");

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task ChunkBlobExistsAsync_ReturnsFalse_WhenBlobDoesNotExist()
        {
            // Arrange
            _mockBlobClient.Setup(x => x.ExistsAsync(It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(Response.FromValue(false, null!));

            // Act
            var result = await _service.ChunkBlobExistsAsync("missing-blob.chunk");

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task GenerateChunkUploadSasAsync_ReturnsDto_WithCorrectBlobNameAndExpiry()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkIndex = 2;
            var expectedBlobName = $"{fileId}/{chunkIndex}.chunk";
            var fakeSasUri = new Uri($"https://test.blob.core.windows.net/test-container/{expectedBlobName}?sv=2020-08-04&se=2021-12-31T23:59:59Z&sr=b&sp=cw&sig=fake");

            // Attempting to mock GenerateSasUri is valid because GenerateSasUri is a virtual method
            _mockBlobClient.Setup(x => x.GenerateSasUri(It.IsAny<BlobSasBuilder>()))
                .Returns(fakeSasUri);

            // Act
            var result = await _service.GenerateChunkUploadSasAsync(fileId, chunkIndex);

            // Assert
            Assert.Equal(fakeSasUri.ToString(), result.SasUrl);
            Assert.Equal(expectedBlobName, result.BlobName);
            
            // Check expiry is roughly what we expect (30 mins from now)
            var expectedExpiry = DateTime.UtcNow.AddMinutes(30);
            Assert.True((result.ExpiresAt - expectedExpiry).Duration() < TimeSpan.FromSeconds(5), 
                "Expiry time is not within the expected range (+30 mins)");
        }
    }
}
