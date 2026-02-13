using System;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class ChunkRegistryEntityTests
    {
        [Fact]
        public void ChunkRegistry_ShouldInitializeWithDefaultValues()
        {
            // Arrange & Act
            var registry = new ChunkRegistry();

            // Assert
            Assert.Equal(string.Empty, registry.Hash);
            Assert.Equal(string.Empty, registry.StoragePath);
            Assert.Equal(0, registry.Size);
            Assert.Equal(0, registry.ReferenceCount);
            Assert.Equal(default, registry.CreatedAt);
        }

        [Fact]
        public void ChunkRegistry_ShouldSetPropertiesCorrectly()
        {
            // Arrange
            var now = DateTime.UtcNow;
            var hash = "abc123hash";
            var path = "/storage/chunks/abc123hash";
            long size = 5242880; // 5MB

            // Act
            var registry = new ChunkRegistry
            {
                Hash = hash,
                StoragePath = path,
                Size = size,
                ReferenceCount = 1,
                CreatedAt = now
            };

            // Assert
            Assert.Equal(hash, registry.Hash);
            Assert.Equal(path, registry.StoragePath);
            Assert.Equal(size, registry.Size);
            Assert.Equal(1, registry.ReferenceCount);
            Assert.Equal(now, registry.CreatedAt);
        }

        [Fact]
        public void ChunkRegistry_ShouldAllowReferenceCountModification()
        {
            // Arrange
            var registry = new ChunkRegistry { ReferenceCount = 1 };

            // Act
            registry.ReferenceCount++;

            // Assert
            Assert.Equal(2, registry.ReferenceCount);
            
            // Act
            registry.ReferenceCount--;

            // Assert
            Assert.Equal(1, registry.ReferenceCount);
        }
    }
}
