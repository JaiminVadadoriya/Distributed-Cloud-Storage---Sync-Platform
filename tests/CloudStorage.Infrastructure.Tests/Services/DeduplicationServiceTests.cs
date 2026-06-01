using System;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class DeduplicationServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly Mock<IChunkStorageProvider> _mockChunkStorage;
        private readonly DeduplicationService _service;

        public DeduplicationServiceTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ApplicationDbContext(options);
            _mockChunkStorage = new Mock<IChunkStorageProvider>();
            _service = new DeduplicationService(_context, _mockChunkStorage.Object);
        }

        [Fact]
        public async Task RegisterChunkAsync_NewChunk_ShouldCreateEntry()
        {
            // Arrange
            var hash = "new-hash";
            var path = "/path/to/chunk";
            var size = 1024L;

            // Act
            var result = await _service.RegisterChunkAsync(hash, path, size);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(hash, result.Hash);
            Assert.Equal(1, result.ReferenceCount);
            Assert.Equal(path, result.StoragePath);
            Assert.Equal(size, result.Size);

            var inDb = await _context.ChunkRegistry.FindAsync(result.Hash);
            Assert.NotNull(inDb);
        }

        [Fact]
        public async Task RegisterChunkAsync_ExistingChunk_ShouldIncrementRefCount()
        {
            // Arrange
            var hash = "existing-hash";
            var existing = new ChunkRegistry
            {
                Hash = hash,
                StoragePath = "/path",
                Size = 100,
                ReferenceCount = 1,
                CreatedAt = DateTime.UtcNow
            };
            _context.ChunkRegistry.Add(existing);
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.RegisterChunkAsync(hash, "/new/path", 100);

            // Assert
            Assert.Equal(hash, result.Hash);
            Assert.Equal(2, result.ReferenceCount);
        }

        [Fact]
        public async Task IsChunkDuplicateAsync_ShouldReturnTrueForExisting()
        {
            // Arrange
            var hash = "duplicate-hash";
            _context.ChunkRegistry.Add(new ChunkRegistry
            {
                Hash = hash,
                StoragePath = "/path",
                Size = 100,
                ReferenceCount = 1,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.IsChunkDuplicateAsync(hash);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task DecrementReferenceAsync_ShouldDecreaseCount()
        {
            // Arrange
            var hash = "ref-hash";
            _context.ChunkRegistry.Add(new ChunkRegistry
            {
                Hash = hash,
                StoragePath = "/path",
                Size = 100,
                ReferenceCount = 2,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Act
            await _service.DecrementReferenceAsync(hash);

            // Assert
            var entry = await _context.ChunkRegistry.FindAsync(hash);
            Assert.NotNull(entry);
            Assert.Equal(1, entry.ReferenceCount);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
