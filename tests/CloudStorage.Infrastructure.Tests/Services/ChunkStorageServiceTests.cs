using System;
using System.IO;
using System.Threading.Tasks;
using CloudStorage.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Xunit;
using System.Collections.Generic;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class ChunkStorageServiceTests : IDisposable
    {
        private readonly ChunkStorageService _service;
        private readonly string _testStoragePath;

        public ChunkStorageServiceTests()
        {
            _testStoragePath = Path.Combine(Path.GetTempPath(), "CloudStorageTests", Guid.NewGuid().ToString());

            var configData = new Dictionary<string, string>
            {
                {"Storage:ChunkPath", _testStoragePath}
            };

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(configData!)
                .Build();

            _service = new ChunkStorageService(configuration);
        }

        [Fact]
        public async Task SaveChunkAsync_ShouldCreateFile()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkIndex = 0;
            var data = new byte[] { 1, 2, 3, 4, 5 };
            using var stream = new MemoryStream(data);

            // Act
            var path = await _service.SaveChunkAsync(fileId, chunkIndex, stream);

            // Assert
            Assert.True(File.Exists(path));
            var savedData = await File.ReadAllBytesAsync(path);
            Assert.Equal(data, savedData);
        }

        [Fact]
        public async Task GetChunkAsync_ShouldReturnStream()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkIndex = 1;
            var data = new byte[] { 10, 20, 30 };
            using var stream = new MemoryStream(data);
            var path = await _service.SaveChunkAsync(fileId, chunkIndex, stream);

            // Act
            using var resultStream = await _service.GetChunkAsync(path);

            // Assert
            using var memoryStream = new MemoryStream();
            await resultStream.CopyToAsync(memoryStream);
            Assert.Equal(data, memoryStream.ToArray());
        }

        [Fact]
        public async Task GetChunkAsync_ShouldThrowExceptionForMissingFile()
        {
            // Act & Assert
            await Assert.ThrowsAsync<FileNotFoundException>(() => _service.GetChunkAsync("non_existent_path.chunk"));
        }

        [Fact]
        public async Task DeleteChunkAsync_ShouldRemoveFile()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var chunkIndex = 2;
            var data = new byte[] { 1, 2, 3 };
            using var stream = new MemoryStream(data);
            var path = await _service.SaveChunkAsync(fileId, chunkIndex, stream);

            // Act
            await _service.DeleteChunkAsync(path);

            // Assert
            Assert.False(File.Exists(path));
        }

        public void Dispose()
        {
            if (Directory.Exists(_testStoragePath))
            {
                try { Directory.Delete(_testStoragePath, true); } catch { }
            }
        }
    }
}
