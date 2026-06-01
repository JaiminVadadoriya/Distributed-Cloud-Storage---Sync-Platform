using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Infrastructure.Upload;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public partial class OrchestrationSystemsTests
    {
        #region 6. Upload Orchestration Tests

        [Fact]
        public async Task UploadOrchestrator_OrchestrateUpload_ResolvesStreamStrategyForSmallFile()
        {
            // Arrange
            var mockNegotiator = new Mock<ICapabilityNegotiator>();
            mockNegotiator.Setup(n => n.ResolveUploadStrategy(It.IsAny<string>(), It.IsAny<long>()))
                .Returns(UploadStrategyType.Stream);

            var mockServiceProvider = new Mock<IServiceProvider>();
            var mockStreamStrategy = new Mock<StreamUploadStrategy>(Mock.Of<IStorageProviderFactory>());
            mockServiceProvider.Setup(s => s.GetService(typeof(StreamUploadStrategy)))
                .Returns(mockStreamStrategy.Object);

            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockProvider = new Mock<IObjectStorageProvider>();
            mockProvider.Setup(p => p.ProviderName).Returns("Local");
            mockFactory.Setup(f => f.GetProvider()).Returns(mockProvider.Object);
            mockServiceProvider.Setup(s => s.GetService(typeof(IStorageProviderFactory)))
                .Returns(mockFactory.Object);

            var orchestrator = new UploadOrchestrator(mockNegotiator.Object, mockServiceProvider.Object, Mock.Of<ILogger<UploadOrchestrator>>());

            var stream = new MemoryStream(new byte[1024]);
            var options = new StorageUploadOptions { Overwrite = true };

            // Act
            await orchestrator.OrchestrateUploadAsync(Guid.NewGuid(), "key-123", stream, 1024, options);

            // Assert
            mockStreamStrategy.Verify(s => s.ExecuteAsync("Local", "key-123", It.IsAny<Stream>(), options, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task UploadOrchestrator_OrchestrateUpload_ResolvesMultipartStrategyForS3LargeFile()
        {
            // Arrange
            var mockNegotiator = new Mock<ICapabilityNegotiator>();
            mockNegotiator.Setup(n => n.ResolveUploadStrategy("S3", It.IsAny<long>()))
                .Returns(UploadStrategyType.Multipart);

            var mockServiceProvider = new Mock<IServiceProvider>();
            var mockMultipartStrategy = new Mock<MultipartUploadStrategy>(
                Mock.Of<IConfiguration>(),
                Mock.Of<ILogger<MultipartUploadStrategy>>(),
                Mock.Of<IStorageProviderFactory>(),
                null
            );
            mockServiceProvider.Setup(s => s.GetService(typeof(MultipartUploadStrategy)))
                .Returns(mockMultipartStrategy.Object);

            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockProvider = new Mock<IObjectStorageProvider>();
            mockProvider.Setup(p => p.ProviderName).Returns("S3");
            mockFactory.Setup(f => f.GetProvider()).Returns(mockProvider.Object);
            mockServiceProvider.Setup(s => s.GetService(typeof(IStorageProviderFactory)))
                .Returns(mockFactory.Object);

            var orchestrator = new UploadOrchestrator(mockNegotiator.Object, mockServiceProvider.Object, Mock.Of<ILogger<UploadOrchestrator>>());

            var stream = new MemoryStream(new byte[10 * 1024 * 1024]);
            var options = new StorageUploadOptions { Overwrite = true };

            // Act
            await orchestrator.OrchestrateUploadAsync(Guid.NewGuid(), "key-123", stream, 10 * 1024 * 1024, options);

            // Assert
            mockMultipartStrategy.Verify(s => s.ExecuteAsync("S3", "key-123", It.IsAny<Stream>(), options, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task UploadOrchestrator_OrchestrateUpload_ResolvesBlockBlobStrategyForAzureLargeFile()
        {
            // Arrange
            var mockNegotiator = new Mock<ICapabilityNegotiator>();
            mockNegotiator.Setup(n => n.ResolveUploadStrategy("Azure", It.IsAny<long>()))
                .Returns(UploadStrategyType.BlockBlob);

            var mockServiceProvider = new Mock<IServiceProvider>();
            var mockBlockBlobStrategy = new Mock<BlockBlobUploadStrategy>(
                Mock.Of<IConfiguration>(),
                Mock.Of<ILogger<BlockBlobUploadStrategy>>(),
                Mock.Of<IStorageProviderFactory>(),
                null
            );
            mockServiceProvider.Setup(s => s.GetService(typeof(BlockBlobUploadStrategy)))
                .Returns(mockBlockBlobStrategy.Object);

            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockProvider = new Mock<IObjectStorageProvider>();
            mockProvider.Setup(p => p.ProviderName).Returns("Azure");
            mockFactory.Setup(f => f.GetProvider()).Returns(mockProvider.Object);
            mockServiceProvider.Setup(s => s.GetService(typeof(IStorageProviderFactory)))
                .Returns(mockFactory.Object);

            var orchestrator = new UploadOrchestrator(mockNegotiator.Object, mockServiceProvider.Object, Mock.Of<ILogger<UploadOrchestrator>>());

            var stream = new MemoryStream(new byte[10 * 1024 * 1024]);
            var options = new StorageUploadOptions { Overwrite = true };

            // Act
            await orchestrator.OrchestrateUploadAsync(Guid.NewGuid(), "key-123", stream, 10 * 1024 * 1024, options);

            // Assert
            mockBlockBlobStrategy.Verify(s => s.ExecuteAsync("Azure", "key-123", It.IsAny<Stream>(), options, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task UploadOrchestrator_OrchestrateUpload_ResolvesResumableStrategyForGcpLargeFile()
        {
            // Arrange
            var mockNegotiator = new Mock<ICapabilityNegotiator>();
            mockNegotiator.Setup(n => n.ResolveUploadStrategy("Gcp", It.IsAny<long>()))
                .Returns(UploadStrategyType.Resumable);

            var mockServiceProvider = new Mock<IServiceProvider>();
            var mockResumableStrategy = new Mock<ResumableUploadStrategy>(
                Mock.Of<IStorageProviderFactory>()
            );
            mockServiceProvider.Setup(s => s.GetService(typeof(ResumableUploadStrategy)))
                .Returns(mockResumableStrategy.Object);

            var mockFactory = new Mock<IStorageProviderFactory>();
            var mockProvider = new Mock<IObjectStorageProvider>();
            mockProvider.Setup(p => p.ProviderName).Returns("Gcp");
            mockFactory.Setup(f => f.GetProvider()).Returns(mockProvider.Object);
            mockServiceProvider.Setup(s => s.GetService(typeof(IStorageProviderFactory)))
                .Returns(mockFactory.Object);

            var orchestrator = new UploadOrchestrator(mockNegotiator.Object, mockServiceProvider.Object, Mock.Of<ILogger<UploadOrchestrator>>());

            var stream = new MemoryStream(new byte[10 * 1024 * 1024]);
            var options = new StorageUploadOptions { Overwrite = true };

            // Act
            await orchestrator.OrchestrateUploadAsync(Guid.NewGuid(), "key-123", stream, 10 * 1024 * 1024, options);

            // Assert
            mockResumableStrategy.Verify(s => s.ExecuteAsync("Gcp", "key-123", It.IsAny<Stream>(), options, It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion
    }
}
