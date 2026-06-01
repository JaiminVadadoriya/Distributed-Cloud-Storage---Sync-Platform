using System;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class DeltaSyncServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly DeltaSyncService _service;

        public DeltaSyncServiceTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // Unique DB per test
                .Options;

            _context = new ApplicationDbContext(options);
            _service = new DeltaSyncService(_context);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Fact]
        public async Task GetChangesSinceAsync_ReturnsExpectedFiles()
        {
            // Arrange
            var userId = 1;
            var sinceUtc = DateTime.UtcNow.AddMinutes(-10);

            // Add unchanged file
            _context.FileMetadata.Add(new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = "old.txt",
                Size = 100,
                OwnerId = userId,
                IsDeleted = false,
                LastModifiedAt = DateTime.UtcNow.AddMinutes(-20),
                Status = UploadStatus.Complete,
                VersionVector = "1:1"
            });

            // Add changed file
            var changedFileId = Guid.NewGuid();
            _context.FileMetadata.Add(new FileMetadata
            {
                Id = changedFileId,
                FileName = "changed.txt",
                Size = 200,
                OwnerId = userId,
                IsDeleted = false,
                LastModifiedAt = DateTime.UtcNow.AddMinutes(-5),
                Status = UploadStatus.Complete,
                VersionVector = "1:2"
            });

            // Add deleted file
            var deletedFileId = Guid.NewGuid();
            _context.FileMetadata.Add(new FileMetadata
            {
                Id = deletedFileId,
                FileName = "deleted.txt",
                Size = 300,
                OwnerId = userId,
                IsDeleted = true,
                LastModifiedAt = DateTime.UtcNow.AddMinutes(-2),
                Status = UploadStatus.Complete,
                VersionVector = "1:1"
            });

            // Add other user's file
            _context.FileMetadata.Add(new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = "other.txt",
                Size = 100,
                OwnerId = 2,
                IsDeleted = false,
                LastModifiedAt = DateTime.UtcNow,
                Status = UploadStatus.Complete,
                VersionVector = "2:1"
            });

            await _context.SaveChangesAsync();

            // Act
            var result = await _service.GetChangesSinceAsync(userId, sinceUtc);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result.ChangedFiles);
            Assert.Equal(changedFileId, result.ChangedFiles.First().Id);

            Assert.Single(result.DeletedFileIds);
            Assert.Equal(deletedFileId, result.DeletedFileIds.First());
        }
    }
}
