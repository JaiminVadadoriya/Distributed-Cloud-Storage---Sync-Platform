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

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class FolderServiceTests
    {
        private readonly Mock<IFolderRepository> _folderRepoMock;
        private readonly Mock<ICacheService> _cacheMock;
        private readonly Mock<IActivityService> _activityMock;
        private readonly FolderService _service;

        public FolderServiceTests()
        {
            _folderRepoMock = new Mock<IFolderRepository>();
            _cacheMock = new Mock<ICacheService>();
            _activityMock = new Mock<IActivityService>();

            _service = new FolderService(
                _folderRepoMock.Object,
                _cacheMock.Object,
                _activityMock.Object);
        }

        [Fact]
        public async Task CreateFolderAsync_CallsRepositoryAndLogsActivity()
        {
            // Arrange
            var userId = 1;
            var dto = new CreateFolderDto { Name = "New Folder", ParentFolderId = null };

            // Act
            var result = await _service.CreateFolderAsync(dto, userId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(dto.Name, result.Name);

            _folderRepoMock.Verify(repo => repo.AddAsync(It.Is<Folder>(f =>
                f.Name == dto.Name && f.OwnerId == userId)), Times.Once);

            _activityMock.Verify(act => act.LogActivityAsync(
                userId, "CREATE", "FOLDER", It.IsAny<string>(), It.IsAny<string>()), Times.Once);

            _cacheMock.Verify(c => c.RemoveByPrefixAsync($"stats:{userId}"), Times.Once);
        }

        [Fact]
        public async Task RenameFolderAsync_UpdatesNameAndLogsActivity()
        {
            // Arrange
            var userId = 1;
            var folderId = Guid.NewGuid();
            var folder = new Folder { Id = folderId, Name = "Old Name", OwnerId = userId };
            var newName = "New Name";

            _folderRepoMock.Setup(repo => repo.GetByIdAsync(folderId)).ReturnsAsync(folder);

            // Act
            var result = await _service.RenameFolderAsync(folderId, newName, userId);

            // Assert
            Assert.Equal(newName, result.Name);
            Assert.Equal(newName, folder.Name);

            _folderRepoMock.Verify(repo => repo.UpdateAsync(folder), Times.Once);
            _activityMock.Verify(act => act.LogActivityAsync(
                userId, "RENAME", "FOLDER", folderId.ToString(), It.IsAny<string>()), Times.Once);
        }
    }
}
