using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.API.Controllers;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Upload;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace CloudStorage.API.Tests.Controllers
{
    public class ChunkUploadControllerTests
    {
        private readonly Mock<IFileMetadataRepository> _mockFileRepo;
        private readonly Mock<IRepository<FileChunk>> _mockChunkRepo;
        private readonly Mock<IChunkStorageProvider> _mockChunkStorage;
        private readonly Mock<IDeduplicationService> _mockDeduplication;
        private readonly Mock<IStorageProviderFactory> _mockProviderFactory;
        private readonly Mock<IChunkVerificationService> _mockVerificationService;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly Mock<IMessageQueue> _mockMessageQueue;
        private readonly Mock<IUploadOrchestrator> _mockUploadOrchestrator;
        private readonly Mock<IFileService> _mockFileService;
        private readonly Mock<IAuthService> _mockAuthService;
        private readonly Mock<ILogger<ChunkUploadController>> _mockLogger;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly ChunkUploadController _controller;
        private readonly int _testUserId = 1;

        public ChunkUploadControllerTests()
        {
            _mockFileRepo = new Mock<IFileMetadataRepository>();
            _mockChunkRepo = new Mock<IRepository<FileChunk>>();
            _mockChunkStorage = new Mock<IChunkStorageProvider>();
            _mockDeduplication = new Mock<IDeduplicationService>();
            _mockProviderFactory = new Mock<IStorageProviderFactory>();
            _mockVerificationService = new Mock<IChunkVerificationService>();
            _mockNotificationService = new Mock<INotificationService>();
            _mockMessageQueue = new Mock<IMessageQueue>();
            _mockUploadOrchestrator = new Mock<IUploadOrchestrator>();
            _mockFileService = new Mock<IFileService>();
            _mockAuthService = new Mock<IAuthService>();
            _mockLogger = new Mock<ILogger<ChunkUploadController>>();
            _mockConfiguration = new Mock<IConfiguration>();

            var mockObjectProvider = new Mock<IObjectStorageProvider>();
            mockObjectProvider.Setup(p => p.ProviderName).Returns("Azure");
            _mockProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>())).Returns(mockObjectProvider.Object);

            var mockSection = new Mock<IConfigurationSection>();
            mockSection.Setup(s => s.Value).Returns((string)null);
            _mockConfiguration.Setup(c => c.GetSection("FileUpload:AllowedContentTypes")).Returns(mockSection.Object);

            _mockAuthService.Setup(s => s.GetUserByIdAsync(It.IsAny<int>()))
                .ReturnsAsync(new User { Id = _testUserId, Username = "testuser", StorageQuota = 10L * 1024 * 1024 * 1024 });

            _mockFileService.Setup(s => s.GetDashboardStatsAsync(It.IsAny<int>()))
                .ReturnsAsync(new DashboardStatsDto { TotalStorageBytes = 100 });

            _controller = new ChunkUploadController(
                _mockFileRepo.Object,
                _mockChunkRepo.Object,
                _mockChunkStorage.Object,
                _mockDeduplication.Object,
                _mockProviderFactory.Object,
                _mockVerificationService.Object,
                _mockNotificationService.Object,
                _mockMessageQueue.Object,
                _mockUploadOrchestrator.Object,
                _mockFileService.Object,
                _mockAuthService.Object,
                _mockLogger.Object,
                _mockConfiguration.Object);

            // Mock User context
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim("id", _testUserId.ToString()),
                new Claim(ClaimTypes.Name, "testuser")
            }, "mock"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [Fact]
        public async Task InitiateUpload_ValidDto_ReturnsOk()
        {
            // Arrange
            var dto = new InitiateUploadDto { FileName = "test.txt", FileSize = 100, TotalChunks = 1, ContentType = "text/plain" };

            // Act
            var result = await _controller.InitiateUpload(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<UploadSessionResponseDto>>(okResult.Value);
            Assert.True(response.Success);
            Assert.NotEmpty(response.Data!.SessionId);
        }

        [Fact]
        public async Task UploadChunk_ValidData_ReturnsOk()
        {
            // Arrange
            var sessionId = "session1";
            var fileData = new byte[100];
            new Random().NextBytes(fileData);

            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var computedHash = BitConverter.ToString(sha256.ComputeHash(fileData)).Replace("-", "").ToLowerInvariant();

            var file = new FileMetadata { Id = Guid.NewGuid(), OwnerId = _testUserId, UploadSessionId = sessionId };
            var chunkFile = new Mock<IFormFile>();
            chunkFile.Setup(f => f.Length).Returns(fileData.Length);
            chunkFile.Setup(f => f.OpenReadStream()).Returns(new System.IO.MemoryStream(fileData));

            _mockFileRepo.Setup(x => x.GetBySessionIdAsync(sessionId)).ReturnsAsync(file);
            _mockDeduplication.Setup(x => x.IsChunkDuplicateAsync(It.IsAny<string>())).ReturnsAsync(false);
            _mockChunkStorage.Setup(x => x.SaveChunkAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<System.IO.Stream>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync("/path/to/chunk");
            _mockDeduplication.Setup(x => x.RegisterChunkAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long>()))
                .ReturnsAsync(new ChunkRegistry());

            // Act
            var request = new ChunkUploadController.UploadChunkRequestDto
            {
                Chunk = chunkFile.Object,
                SessionId = sessionId,
                ChunkIndex = 0,
                Hash = computedHash
            };
            var result = await _controller.UploadChunk(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<ChunkUploadResponseDto>>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal("uploaded", response.Data!.Status);
        }

        [Fact]
        public async Task CompleteUpload_ValidSession_ReturnsOk()
        {
            // Arrange
            var sessionId = "session1";
            var file = new FileMetadata
            {
                Id = Guid.NewGuid(),
                OwnerId = _testUserId,
                UploadSessionId = sessionId,
                ChunkCount = 2,
                UploadedChunks = 2,
                Status = UploadStatus.InProgress
            };
            var dto = new CompleteUploadDto { SessionId = sessionId };

            _mockFileRepo.Setup(x => x.GetBySessionIdAsync(sessionId)).ReturnsAsync(file);
            _mockVerificationService.Setup(x => x.VerifyAllChunksAsync(file.Id, file.ChunkCount, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new ChunkVerificationResult(true, Array.Empty<int>()));

            // Act
            var result = await _controller.CompleteUpload(dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            _mockFileRepo.Verify(x => x.UpdateAsync(It.Is<FileMetadata>(f => f.Status == UploadStatus.Complete)), Times.Once);
        }

        [Fact]
        public async Task GetUploadStatus_ValidSession_ReturnsOk()
        {
            // Arrange
            var sessionId = "session1";
            var file = new FileMetadata
            {
                Id = Guid.NewGuid(),
                OwnerId = _testUserId,
                UploadSessionId = sessionId,
                ChunkCount = 5,
                UploadedChunks = 2
            };
            file.Chunks.Add(new FileChunk { ChunkIndex = 0 });
            file.Chunks.Add(new FileChunk { ChunkIndex = 1 });

            _mockFileRepo.Setup(x => x.GetBySessionIdAsync(sessionId)).ReturnsAsync(file);

            // Act
            var result = await _controller.GetUploadStatus(sessionId);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ApiResponse<UploadStatusResponseDto>>(okResult.Value);
            Assert.True(response.Success);
            Assert.Equal(2, response.Data!.UploadedChunks.Length);
        }
    }
}
