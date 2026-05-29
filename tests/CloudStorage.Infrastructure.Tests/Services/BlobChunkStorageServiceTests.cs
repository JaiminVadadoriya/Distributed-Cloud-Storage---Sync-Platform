using System;
using System.IO;
using System.Threading.Tasks;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class BlobChunkStorageServiceTests
    {
        private readonly Mock<BlobServiceClient> _mockBlobServiceClient;
        private readonly Mock<BlobContainerClient> _mockContainerClient;
        private readonly Mock<BlobClient> _mockBlobClient;
        private readonly Mock<IBlobSasService> _mockSasService;
        private readonly Mock<IConfiguration> _mockConfig;
        private readonly Mock<ILogger<BlobChunkStorageService>> _mockLogger;
        private readonly BlobChunkStorageService _service;

        public BlobChunkStorageServiceTests()
        {
            _mockBlobServiceClient = new Mock<BlobServiceClient>();
            _mockContainerClient = new Mock<BlobContainerClient>();
            _mockBlobClient = new Mock<BlobClient>();
            _mockSasService = new Mock<IBlobSasService>();
            _mockConfig = new Mock<IConfiguration>();
            _mockLogger = new Mock<ILogger<BlobChunkStorageService>>();

            _mockConfig.Setup(c => c["AzureBlob:ContainerName"]).Returns("test-container");

            _mockBlobServiceClient
                .Setup(x => x.GetBlobContainerClient(It.IsAny<string>()))
                .Returns(_mockContainerClient.Object);

            _mockContainerClient
                .Setup(x => x.CreateIfNotExistsAsync(It.IsAny<PublicAccessType>(), It.IsAny<System.Collections.Generic.IDictionary<string, string>>(), It.IsAny<BlobContainerEncryptionScopeOptions>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(Response.FromValue((BlobContainerInfo)null!, null!));

            _mockContainerClient
                .Setup(x => x.GetBlobClient(It.IsAny<string>()))
                .Returns(_mockBlobClient.Object);

            _service = new BlobChunkStorageService(_mockBlobServiceClient.Object, _mockSasService.Object, _mockConfig.Object, _mockLogger.Object);
        }

        [Fact]
        public async Task GenerateSasUploadUrlAsync_DelegatesToSasService()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkIndex = 0;
            var sasResponse = new SasUploadUrlResponseDto { SasUrl = "https://test.sas.url" };

            _mockSasService.Setup(x => x.GenerateChunkUploadSasAsync(fileId, chunkIndex))
                .ReturnsAsync(sasResponse);

            // Act
            var result = await _service.GenerateSasUploadUrlAsync(fileId, chunkIndex, TimeSpan.FromMinutes(15));

            // Assert
            Assert.Equal("https://test.sas.url", result);
            _mockSasService.Verify(x => x.GenerateChunkUploadSasAsync(fileId, chunkIndex), Times.Once);
        }

        [Fact]
        public async Task SaveChunkAsync_UploadsToBlobStorage_AndReturnsUri()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkIndex = 1;
            using var stream = new MemoryStream();

            var fakeUri = new Uri("https://test.blob.core.windows.net/test-container/blob.chunk");
            _mockBlobClient.SetupGet(x => x.Uri).Returns(fakeUri);

            _mockBlobClient.Setup(x => x.UploadAsync(stream, true, It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(Response.FromValue((BlobContentInfo)null!, null!));

            // Mock GetPropertiesAsync for SSE verification
            var mockProperties = BlobsModelFactory.BlobProperties(isServerEncrypted: true);
            _mockBlobClient.Setup(x => x.GetPropertiesAsync(It.IsAny<BlobRequestConditions>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(Response.FromValue(mockProperties, null!));

            // Act
            var result = await _service.SaveChunkAsync(fileId, chunkIndex, stream);

            // Assert
            Assert.Equal(fakeUri.ToString(), result);
        }

        [Fact]
        public async Task DeleteChunkAsync_DeletesBlob()
        {
            // Arrange
            var storagePath = "https://test.blob.core.windows.net/test-container/blob.chunk";

            _mockBlobClient.Setup(x => x.DeleteIfExistsAsync(It.IsAny<DeleteSnapshotsOption>(), It.IsAny<BlobRequestConditions>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(Response.FromValue(true, null!));

            // Act
            await _service.DeleteChunkAsync(storagePath);

            // Assert
            _mockBlobClient.Verify(x => x.DeleteIfExistsAsync(It.IsAny<DeleteSnapshotsOption>(), It.IsAny<BlobRequestConditions>(), It.IsAny<System.Threading.CancellationToken>()), Times.Once);
        }
    }
}
