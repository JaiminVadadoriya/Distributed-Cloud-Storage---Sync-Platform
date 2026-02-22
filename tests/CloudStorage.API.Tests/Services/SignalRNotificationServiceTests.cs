using System;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.API.Hubs;
using CloudStorage.API.Services;
using CloudStorage.Application.DTOs;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace CloudStorage.API.Tests.Services
{
    public class SignalRNotificationServiceTests
    {
        private readonly Mock<IHubContext<FileStorageHub>> _mockHubContext;
        private readonly Mock<IHubClients> _mockClients;
        private readonly Mock<IClientProxy> _mockClientProxy;
        private readonly SignalRNotificationService _service;

        public SignalRNotificationServiceTests()
        {
            _mockHubContext = new Mock<IHubContext<FileStorageHub>>();
            _mockClients = new Mock<IHubClients>();
            _mockClientProxy = new Mock<IClientProxy>();

            _mockHubContext.Setup(h => h.Clients).Returns(_mockClients.Object);
            _mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(_mockClientProxy.Object);

            _service = new SignalRNotificationService(_mockHubContext.Object);
        }

        [Fact]
        public async Task NotifyFileUploadedAsync_SendsMessageToGroup()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var fileName = "test.txt";
            var size = 100L;
            var ownerId = 1;

            // Act
            await _service.NotifyFileUploadedAsync(fileId, fileName, size, ownerId);

            // Assert
            _mockClients.Verify(c => c.Group($"user_{ownerId}"), Times.Once);
            _mockClientProxy.Verify(c => c.SendCoreAsync(
                "FileEvent",
                It.Is<object[]>(args => 
                    args.Length == 1 &&
                    ((FileEventDto)args[0]).FileId == fileId &&
                    ((FileEventDto)args[0]).EventType == "FileUploaded"),
                It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task NotifyFileDeletedAsync_SendsMessageToGroup()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var ownerId = 1;

            // Act
            await _service.NotifyFileDeletedAsync(fileId, ownerId);

            // Assert
            _mockClients.Verify(c => c.Group($"user_{ownerId}"), Times.Once);
            _mockClientProxy.Verify(c => c.SendCoreAsync(
                "FileEvent",
                It.Is<object[]>(args => 
                    args.Length == 1 &&
                    ((FileEventDto)args[0]).FileId == fileId &&
                    ((FileEventDto)args[0]).EventType == "FileDeleted"),
                It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task NotifyAllFilesDeletedAsync_SendsMessageToGroup()
        {
            // Arrange
            var ownerId = 1;

            // Act
            await _service.NotifyAllFilesDeletedAsync(ownerId);

            // Assert
            _mockClients.Verify(c => c.Group($"user_{ownerId}"), Times.Once);
            _mockClientProxy.Verify(c => c.SendCoreAsync(
                "FileEvent",
                It.Is<object[]>(args => 
                    args.Length == 1 &&
                    ((FileEventDto)args[0]).EventType == "AllFilesDeleted"),
                It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
