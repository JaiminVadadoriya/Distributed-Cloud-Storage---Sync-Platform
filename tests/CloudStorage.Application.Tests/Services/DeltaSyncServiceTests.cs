using System;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public class DeltaSyncServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly DeltaSyncService _deltaSyncService;

        public DeltaSyncServiceTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ApplicationDbContext(options);
            _deltaSyncService = new DeltaSyncService(_context);
        }

        [Fact]
        public async Task GetChangesSinceAsync_ShouldReturnChangedAndDeletedFiles()
        {
            // Arrange
            var userId = 1;
            var baseline = DateTime.UtcNow.AddHours(-1);

            // Changed file
            var file1 = new FileMetadata 
            { 
                Id = Guid.NewGuid(), 
                FileName = "new.txt", 
                OwnerId = userId, 
                CreatedAt = DateTime.UtcNow, 
                LastModifiedAt = DateTime.UtcNow,
                Status = UploadStatus.Complete,
                IsDeleted = false
            };
            
            // Deleted file
            var file2 = new FileMetadata 
            { 
                Id = Guid.NewGuid(), 
                FileName = "deleted.txt", 
                OwnerId = userId, 
                CreatedAt = baseline.AddHours(-1), 
                LastModifiedAt = DateTime.UtcNow, // Deleted recently
                IsDeleted = true 
            };

            // Old file (should not be included)
            var file3 = new FileMetadata 
            { 
                Id = Guid.NewGuid(), 
                FileName = "old.txt", 
                OwnerId = userId, 
                CreatedAt = baseline.AddHours(-2), 
                LastModifiedAt = baseline.AddHours(-1),
                IsDeleted = false 
            };

            _context.FileMetadata.AddRange(file1, file2, file3);
            await _context.SaveChangesAsync();

            // Act
            var result = await _deltaSyncService.GetChangesSinceAsync(userId, baseline);

            // Assert
            Assert.Single(result.ChangedFiles);
            Assert.Equal(file1.Id, result.ChangedFiles.First().Id);
            Assert.Single(result.DeletedFileIds);
            Assert.Equal(file2.Id, result.DeletedFileIds.First());
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
