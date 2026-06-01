using System;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class FileChunkEntityTests
    {
        [Fact]
        public void FileChunk_ShouldInitializeWithDefaultValues()
        {
            // Arrange & Act
            var chunk = new FileChunk();

            // Assert
            Assert.Equal(Guid.Empty, chunk.Id);
            Assert.Equal(Guid.Empty, chunk.FileMetadataId);
            Assert.Null(chunk.FileMetadata);
            Assert.Equal(0, chunk.ChunkIndex);
            Assert.Equal(0, chunk.Size);
            Assert.Equal(string.Empty, chunk.Hash);
            Assert.Equal(string.Empty, chunk.StoragePath);
            Assert.False(chunk.IsDuplicate);
            Assert.Null(chunk.DuplicateSourceId);
            Assert.Equal(default, chunk.CreatedAt);
            Assert.Equal(default, chunk.UploadedAt);
        }

        [Fact]
        public void FileChunk_ShouldSetPropertiesCorrectly()
        {
            // Arrange
            var id = Guid.NewGuid();
            var fileId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            // Act
            var chunk = new FileChunk
            {
                Id = id,
                FileMetadataId = fileId,
                ChunkIndex = 5,
                Size = 1024,
                Hash = "hash123",
                StoragePath = "/path/to/chunk",
                BlobUrl = "http://blob/url",
                IsDuplicate = true,
                DuplicateSourceId = "source-hash",
                CreatedAt = now,
                UploadedAt = now
            };

            // Assert
            Assert.Equal(id, chunk.Id);
            Assert.Equal(fileId, chunk.FileMetadataId);
            Assert.Equal(5, chunk.ChunkIndex);
            Assert.Equal(1024, chunk.Size);
            Assert.Equal("hash123", chunk.Hash);
            Assert.Equal("/path/to/chunk", chunk.StoragePath);
            Assert.Equal("http://blob/url", chunk.BlobUrl);
            Assert.True(chunk.IsDuplicate);
            Assert.Equal("source-hash", chunk.DuplicateSourceId);
            Assert.Equal(now, chunk.CreatedAt);
            Assert.Equal(now, chunk.UploadedAt);
        }

        [Fact]
        public void FileChunk_ShouldAssociateWithFileMetadata()
        {
            // Arrange
            var file = new FileMetadata { Id = Guid.NewGuid(), FileName = "test.txt" };

            // Act
            var chunk = new FileChunk
            {
                FileMetadataId = file.Id,
                FileMetadata = file
            };

            // Assert
            Assert.Equal(file.Id, chunk.FileMetadataId);
            Assert.Same(file, chunk.FileMetadata);
        }
    }
}
