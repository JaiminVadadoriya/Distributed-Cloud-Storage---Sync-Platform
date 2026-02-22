using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CloudStorage.API.Controllers;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CloudStorage.API.Tests.Controllers
{
    public class ChunkUploadControllerTests
    {
        private readonly Mock<IFileMetadataRepository> _mockFileRepo;
        private readonly Mock<IRepository<FileChunk>> _mockChunkRepo;
        private readonly Mock<IChunkStorageService> _mockChunkStorage;
        private readonly Mock<IDeduplicationService> _mockDeduplication;
        private readonly Mock<IBlobSasService> _mockSasService;
        private readonly Mock<IAzureChunkVerificationService> _mockVerificationService;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly ChunkUploadController _controller;
        private readonly int _testUserId = 1;

        public ChunkUploadControllerTests()
        {
            _mockFileRepo = new Mock<IFileMetadataRepository>();
            _mockChunkRepo = new Mock<IRepository<FileChunk>>();
            _mockChunkStorage = new Mock<IChunkStorageService>();
            _mockDeduplication = new Mock<IDeduplicationService>();
            _mockSasService = new Mock<IBlobSasService>();
            _mockVerificationService = new Mock<IAzureChunkVerificationService>();
            _mockNotificationService = new Mock<INotificationService>();
            _controller = new ChunkUploadController(
                _mockFileRepo.Object, 
                _mockChunkRepo.Object,
                _mockChunkStorage.Object, 
                _mockDeduplication.Object,
                _mockSasService.Object,
                _mockVerificationService.Object,
                _mockNotificationService.Object);

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
            var response = Assert.IsType<UploadSessionResponseDto>(okResult.Value);
            Assert.NotEmpty(response.SessionId);
        }

        [Fact]
        public async Task UploadChunk_ValidData_ReturnsOk()
        {
            // Arrange
            var sessionId = "session1";
            var file = new FileMetadata { Id = Guid.NewGuid(), OwnerId = _testUserId, UploadSessionId = sessionId };
            var chunkFile = new Mock<IFormFile>();
            chunkFile.Setup(f => f.Length).Returns(100);
            chunkFile.Setup(f => f.OpenReadStream()).Returns(new System.IO.MemoryStream());

            _mockFileRepo.Setup(x => x.GetBySessionIdAsync(sessionId)).ReturnsAsync(file);
            _mockDeduplication.Setup(x => x.IsChunkDuplicateAsync(It.IsAny<string>())).ReturnsAsync(false);
            _mockChunkStorage.Setup(x => x.SaveChunkAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<System.IO.Stream>()))
                .ReturnsAsync("/path/to/chunk");
            _mockDeduplication.Setup(x => x.RegisterChunkAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<long>()))
                .ReturnsAsync(new ChunkRegistry());

            // Act
            var result = await _controller.UploadChunk(chunkFile.Object, sessionId, 0, "hash");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<ChunkUploadResponseDto>(okResult.Value);
            Assert.Equal("uploaded", response.Status);
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
            _mockVerificationService.Setup(x => x.VerifyAllChunksAsync(file.Id, file.ChunkCount))
                .ReturnsAsync(new BlobChunkVerificationResultDto { IsValid = true });

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
            var response = Assert.IsType<UploadStatusResponseDto>(okResult.Value);
            Assert.Equal(2, response.UploadedChunks.Length);
        }
    }
}
