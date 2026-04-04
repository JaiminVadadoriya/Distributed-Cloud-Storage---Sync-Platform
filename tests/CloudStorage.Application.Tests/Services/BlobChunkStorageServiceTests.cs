using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public class BlobChunkStorageServiceTests
    {
        private readonly Mock<BlobServiceClient> _blobServiceClientMock;
        private readonly Mock<BlobContainerClient> _containerClientMock;
        private readonly Mock<BlobClient> _blobClientMock;
        private readonly Mock<IBlobSasService> _sasServiceMock;
        private readonly Mock<IConfiguration> _configMock;
        private readonly Mock<ILogger<BlobChunkStorageService>> _loggerMock;
        private readonly BlobChunkStorageService _service;

        public BlobChunkStorageServiceTests()
        {
            _blobServiceClientMock = new Mock<BlobServiceClient>();
            _containerClientMock = new Mock<BlobContainerClient>();
            _blobClientMock = new Mock<BlobClient>();
            _sasServiceMock = new Mock<IBlobSasService>();
            _configMock = new Mock<IConfiguration>();
            _loggerMock = new Mock<ILogger<BlobChunkStorageService>>();

            _configMock.Setup(c => c["AzureBlob:ContainerName"]).Returns("test-container");

            _blobServiceClientMock
                .Setup(s => s.GetBlobContainerClient(It.IsAny<string>()))
                .Returns(_containerClientMock.Object);

            _containerClientMock
                .Setup(c => c.GetBlobClient(It.IsAny<string>()))
                .Returns(_blobClientMock.Object);

            _service = new BlobChunkStorageService(
                _blobServiceClientMock.Object,
                _sasServiceMock.Object,
                _configMock.Object,
                _loggerMock.Object);
        }

        [Fact]
        public async Task SaveChunkAsync_ShouldUploadAndCheckEncryption()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkIndex = 0;
            var data = new MemoryStream(new byte[] { 1, 2, 3 });
            
            var properties = BlobsModelFactory.BlobProperties(isServerEncrypted: true);
            var responseMock = new Mock<Response<BlobProperties>>();
            responseMock.Setup(r => r.Value).Returns(properties);
            
            _blobClientMock
                .Setup(c => c.GetPropertiesAsync(null, default))
                .ReturnsAsync(responseMock.Object);

            _blobClientMock.Setup(c => c.Uri).Returns(new Uri("http://blob/test"));

            // Act
            var result = await _service.SaveChunkAsync(fileId, chunkIndex, data);

            // Assert
            Assert.Equal("http://blob/test", result);
            _blobClientMock.Verify(c => c.UploadAsync(data, true, default), Times.Once);
        }

        [Fact]
        public async Task VerifyEncryptionStatusAsync_ShouldReturnTrueIfEncrypted()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkIndex = 0;

            _blobClientMock.Setup(c => c.ExistsAsync(default)).ReturnsAsync(Response.FromValue(true, null!));
            
            var properties = BlobsModelFactory.BlobProperties(isServerEncrypted: true);
            var responseMock = new Mock<Response<BlobProperties>>();
            responseMock.Setup(r => r.Value).Returns(properties);
            
            _blobClientMock
                .Setup(c => c.GetPropertiesAsync(null, default))
                .ReturnsAsync(responseMock.Object);

            // Act
            var result = await _service.VerifyEncryptionStatusAsync(fileId, chunkIndex);

            // Assert
            Assert.True(result);
        }
    }
}
