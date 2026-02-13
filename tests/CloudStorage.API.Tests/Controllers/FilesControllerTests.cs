using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using CloudStorage.API.Controllers;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CloudStorage.API.Tests.Controllers
{
    public class FilesControllerTests
    {
        private readonly Mock<IFileService> _mockFileService;
        private readonly FilesController _controller;
        private readonly int _testUserId = 1;

        public FilesControllerTests()
        {
            _mockFileService = new Mock<IFileService>();
            _controller = new FilesController(_mockFileService.Object);

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
        public async Task GetUserFiles_ReturnsOk()
        {
            // Arrange
            var files = new List<FileListDto> { new FileListDto { Id = Guid.NewGuid(), FileName = "test.txt", Size = 100, CreatedAt = DateTime.UtcNow, IsShared = false } };
            _mockFileService.Setup(x => x.GetUserFilesAsync(_testUserId))
                .ReturnsAsync(files);

            // Act
            var result = await _controller.GetUserFiles();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(files, okResult.Value);
        }

        [Fact]
        public async Task GetFileById_ValidId_ReturnsOk()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var file = new FileResponseDto { Id = fileId, FileName = "test.txt", Size = 100, ContentType = "text/plain", OwnerId = _testUserId };
            _mockFileService.Setup(x => x.GetFileByIdAsync(fileId, _testUserId))
                .ReturnsAsync(file);

            // Act
            var result = await _controller.GetFileById(fileId);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(file, okResult.Value);
        }

        [Fact]
        public async Task GetFileById_NotFound_ReturnsNotFound()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            _mockFileService.Setup(x => x.GetFileByIdAsync(fileId, _testUserId))
                .ReturnsAsync((FileResponseDto?)null);

            // Act
            var result = await _controller.GetFileById(fileId);

            // Assert
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task CreateFile_ValidDto_ReturnsCreated()
        {
            // Arrange
            var dto = new FileUploadDto { FileName = "new.txt", Size = 100, ContentType = "text/plain" };
            var file = new FileResponseDto { Id = Guid.NewGuid(), FileName = "new.txt", Size = 100, ContentType = "text/plain", OwnerId = _testUserId };
            _mockFileService.Setup(x => x.CreateFileMetadataAsync(dto, _testUserId))
                .ReturnsAsync(file);

            // Act
            var result = await _controller.CreateFile(dto);

            // Assert
            var createdResult = Assert.IsType<CreatedAtActionResult>(result);
            Assert.Equal(file, createdResult.Value);
        }

        [Fact]
        public async Task DeleteFile_ValidId_ReturnsOk()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            _mockFileService.Setup(x => x.DeleteFileAsync(fileId, _testUserId))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _controller.DeleteFile(fileId);

            // Assert
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task GrantPermission_ValidDto_ReturnsOk()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var dto = new FilePermissionDto { UserId = 2, PermissionType = "Read" };
            _mockFileService.Setup(x => x.GrantPermissionAsync(fileId, dto.UserId, _testUserId, PermissionType.Read))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _controller.GrantPermission(fileId, dto);

            // Assert
            Assert.IsType<OkObjectResult>(result);
        }
    }
}
