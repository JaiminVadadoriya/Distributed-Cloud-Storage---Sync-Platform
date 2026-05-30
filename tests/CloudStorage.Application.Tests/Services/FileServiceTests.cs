using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using CloudStorage.Infrastructure.Services;
using Moq;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public class FileServiceTests
    {
        private readonly Mock<IFileMetadataRepository> _fileRepositoryMock;
        private readonly Mock<IFolderRepository> _folderRepositoryMock;
        private readonly Mock<IUserRepository> _userRepositoryMock;
        private readonly Mock<ICacheService> _cacheServiceMock;
        private readonly Mock<IActivityService> _activityServiceMock;
        private readonly FileService _fileService;

        public FileServiceTests()
        {
            _fileRepositoryMock = new Mock<IFileMetadataRepository>();
            _folderRepositoryMock = new Mock<IFolderRepository>();
            _userRepositoryMock = new Mock<IUserRepository>();
            _cacheServiceMock = new Mock<ICacheService>();
            _activityServiceMock = new Mock<IActivityService>();

            // Set up default mock behavior for cache to return null so normal DB logic flows
            _cacheServiceMock.Setup(c => c.GetAsync<FileResponseDto?>(It.IsAny<string>())).ReturnsAsync((FileResponseDto?)null);
            _cacheServiceMock.Setup(c => c.GetAsync<bool?>(It.IsAny<string>())).ReturnsAsync((bool?)null);
            _cacheServiceMock.Setup(c => c.GetAsync<DashboardStatsDto?>(It.IsAny<string>())).ReturnsAsync((DashboardStatsDto?)null);

            _fileService = new FileService(
                _fileRepositoryMock.Object,
                _folderRepositoryMock.Object,
                _userRepositoryMock.Object,
                _cacheServiceMock.Object,
                _activityServiceMock.Object);
        }

        [Fact]
        public async Task GetUserFilesAsync_ShouldReturnUserFiles()
        {
            // Arrange
            var userId = 1;
            var files = new List<FileMetadata>
            {
                new FileMetadata { Id = Guid.NewGuid(), FileName = "file1.txt", OwnerId = userId, Size = 100, CreatedAt = DateTime.UtcNow, Status = UploadStatus.Complete },
                new FileMetadata { Id = Guid.NewGuid(), FileName = "file2.txt", OwnerId = userId, Size = 200, CreatedAt = DateTime.UtcNow, Status = UploadStatus.Complete }
            };

            _fileRepositoryMock.Setup(r => r.GetUserFilesAsync(userId, false))
                .ReturnsAsync(files);
            _fileRepositoryMock.Setup(r => r.GetSharedFilesAsync(userId))
                .ReturnsAsync(new List<FileMetadata>());

            // Act
            var result = await _fileService.GetUserFilesAsync(userId);

            // Assert
            Assert.Equal(2, result.Count());
            Assert.All(result, file => Assert.False(file.IsShared));
        }

        [Fact]
        public async Task GetFileByIdAsync_WithPermission_ShouldReturnFile()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var userId = 1;
            var file = new FileMetadata
            {
                Id = fileId,
                FileName = "test.txt",
                ContentType = "text/plain",
                Size = 100,
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow,
                LastModifiedAt = DateTime.UtcNow,
                Status = UploadStatus.Complete
            };
            var owner = new User { Id = userId, Username = "owner" };

            _fileRepositoryMock.Setup(r => r.HasPermissionAsync(fileId, userId, PermissionType.Read))
                .ReturnsAsync(true);
            _fileRepositoryMock.Setup(r => r.GetByIdAsync(fileId))
                .ReturnsAsync(file);
            _userRepositoryMock.Setup(r => r.GetByIdAsync(userId))
                .ReturnsAsync(owner);

            // Act
            var result = await _fileService.GetFileByIdAsync(fileId, userId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("test.txt", result.FileName);
            Assert.Equal("owner", result.OwnerUsername);
        }

        [Fact]
        public async Task GetFileByIdAsync_WithoutPermission_ShouldReturnNull()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var userId = 1;

            _fileRepositoryMock.Setup(r => r.HasPermissionAsync(fileId, userId, PermissionType.Read))
                .ReturnsAsync(false);

            // Act
            var result = await _fileService.GetFileByIdAsync(fileId, userId);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task CreateFileMetadataAsync_ShouldCreateAndReturnFile()
        {
            // Arrange
            var dto = new FileUploadDto
            {
                FileName = "upload.txt",
                ContentType = "text/plain",
                Size = 1024,
                ChunkCount = 1,
                Hash = "abc123"
            };
            var userId = 1;
            var owner = new User { Id = userId, Username = "testuser" };

            _fileRepositoryMock.Setup(r => r.AddAsync(It.IsAny<FileMetadata>()))
                .ReturnsAsync((FileMetadata f) => f);
            _userRepositoryMock.Setup(r => r.GetByIdAsync(userId))
                .ReturnsAsync(owner);

            // Act
            var result = await _fileService.CreateFileMetadataAsync(dto, userId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("upload.txt", result.FileName);
            Assert.Equal(1024, result.Size);
            Assert.Equal("testuser", result.OwnerUsername);
            _fileRepositoryMock.Verify(r => r.AddAsync(It.IsAny<FileMetadata>()), Times.Once);
        }

        [Fact]
        public async Task DeleteFileAsync_AsOwner_ShouldMarkAsDeleted()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var userId = 1;
            var file = new FileMetadata
            {
                Id = fileId,
                FileName = "test.txt",
                OwnerId = userId,
                IsDeleted = false
            };

            _fileRepositoryMock.Setup(r => r.GetByIdAsync(fileId))
                .ReturnsAsync(file);

            // Act
            await _fileService.DeleteFileAsync(fileId, userId);

            // Assert
            Assert.True(file.IsDeleted);
            _fileRepositoryMock.Verify(r => r.UpdateAsync(file), Times.Once);
        }

        [Fact]
        public async Task DeleteFileAsync_AsNonOwner_ShouldThrowUnauthorizedException()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var ownerId = 1;
            var userId = 2;
            var file = new FileMetadata
            {
                Id = fileId,
                FileName = "test.txt",
                OwnerId = ownerId,
                IsDeleted = false
            };

            _fileRepositoryMock.Setup(r => r.GetByIdAsync(fileId))
                .ReturnsAsync(file);

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _fileService.DeleteFileAsync(fileId, userId));
        }

        [Fact]
        public async Task GrantPermissionAsync_AsOwner_ShouldAddPermission()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var ownerId = 1;
            var targetUserId = 2;
            var file = new FileMetadata
            {
                Id = fileId,
                FileName = "test.txt",
                OwnerId = ownerId,
                Permissions = new List<FilePermission>()
            };

            _fileRepositoryMock.Setup(r => r.GetWithPermissionsAsync(fileId))
                .ReturnsAsync(file);

            // Act
            await _fileService.GrantPermissionAsync(fileId, targetUserId, ownerId, PermissionType.Read);

            // Assert
            Assert.Single(file.Permissions);
            Assert.Equal(targetUserId, file.Permissions.First().UserId);
            Assert.Equal(PermissionType.Read, file.Permissions.First().PermissionType);
            _fileRepositoryMock.Verify(r => r.UpdateAsync(file), Times.Once);
        }

        [Fact]
        public async Task GrantPermissionAsync_AsNonOwner_ShouldThrowUnauthorizedException()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var ownerId = 1;
            var grantorId = 2;
            var targetUserId = 3;
            var file = new FileMetadata
            {
                Id = fileId,
                FileName = "test.txt",
                OwnerId = ownerId,
                Permissions = new List<FilePermission>()
            };

            _fileRepositoryMock.Setup(r => r.GetWithPermissionsAsync(fileId))
                .ReturnsAsync(file);

            // Act & Assert
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                _fileService.GrantPermissionAsync(fileId, targetUserId, grantorId, PermissionType.Read));
        }

        [Fact]
        public async Task HasPermissionAsync_ShouldCallRepository()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var userId = 1;
            _fileRepositoryMock.Setup(r => r.HasPermissionAsync(fileId, userId, PermissionType.Read))
                .ReturnsAsync(true);

            // Act
            var result = await _fileService.HasPermissionAsync(fileId, userId, PermissionType.Read);

            // Assert
            Assert.True(result);
            _fileRepositoryMock.Verify(r => r.HasPermissionAsync(fileId, userId, PermissionType.Read), Times.Once);
        }

        [Fact]
        public async Task DeleteAllUserFilesAsync_ShouldCallRepositoryDeleteAllUserFiles()
        {
            // Arrange
            var userId = 1;

            // Act
            await _fileService.DeleteAllUserFilesAsync(userId);

            // Assert
            _fileRepositoryMock.Verify(r => r.DeleteAllUserFilesAsync(userId), Times.Once);
        }

        [Fact]
        public async Task GetStorageBreakdownAsync_ShouldCategorizeFilesCorrectly()
        {
            // Arrange
            var userId = 1;
            var files = new List<FileMetadata>
            {
                new FileMetadata { Id = Guid.NewGuid(), FileName = "image.png", ContentType = "image/png", Size = 100, OwnerId = userId, Status = UploadStatus.Complete },
                new FileMetadata { Id = Guid.NewGuid(), FileName = "video.mp4", ContentType = "video/mp4", Size = 200, OwnerId = userId, Status = UploadStatus.Complete },
                new FileMetadata { Id = Guid.NewGuid(), FileName = "doc.pdf", ContentType = "application/pdf", Size = 300, OwnerId = userId, Status = UploadStatus.Complete },
                new FileMetadata { Id = Guid.NewGuid(), FileName = "other.zip", ContentType = "application/zip", Size = 400, OwnerId = userId, Status = UploadStatus.Complete }
            };

            _fileRepositoryMock.Setup(r => r.GetUserFilesAsync(userId, false))
                .ReturnsAsync(files);

            // Act
            var result = await _fileService.GetStorageBreakdownAsync(userId);

            // Assert
            Assert.Equal(100, result.Images);
            Assert.Equal(200, result.Videos);
            Assert.Equal(300, result.Documents);
            Assert.Equal(400, result.Others);
        }
    }
}
