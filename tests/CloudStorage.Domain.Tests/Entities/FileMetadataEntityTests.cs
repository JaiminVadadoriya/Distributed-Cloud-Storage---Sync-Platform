using System;
using System.Linq;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class FileMetadataEntityTests
    {
        [Fact]
        public void FileMetadata_ShouldInitializeWithDefaultValues()
        {
            // Act
            var file = new FileMetadata();

            // Assert
            Assert.Equal(Guid.Empty, file.Id);
            Assert.Equal(string.Empty, file.FileName);
            Assert.Equal(string.Empty, file.ContentType);
            Assert.Equal(0, file.Size);
            Assert.Equal(1, file.Version);
            Assert.Null(file.ParentVersionId);
            Assert.Equal(0, file.ChunkCount);
            Assert.Equal(string.Empty, file.Hash);
            Assert.Equal(0, file.OwnerId);
            Assert.False(file.IsDeleted);
            Assert.Equal(string.Empty, file.StoragePath);
            Assert.NotNull(file.Chunks);
            Assert.Empty(file.Chunks);
            Assert.NotNull(file.Permissions);
            Assert.Empty(file.Permissions);
            Assert.NotNull(file.SyncEvents);
            Assert.Empty(file.SyncEvents);
        }

        [Fact]
        public void FileMetadata_ShouldSetPropertiesCorrectly()
        {
            // Arrange
            var id = Guid.NewGuid();
            var parentId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            // Act
            var file = new FileMetadata
            {
                Id = id,
                FileName = "test.txt",
                ContentType = "text/plain",
                Size = 1024,
                Version = 2,
                ParentVersionId = parentId,
                ChunkCount = 5,
                Hash = "abc123",
                CreatedAt = now,
                LastModifiedAt = now,
                LastSyncedAt = now,
                OwnerId = 1,
                IsDeleted = false,
                StoragePath = "/storage/test.txt"
            };

            // Assert
            Assert.Equal(id, file.Id);
            Assert.Equal("test.txt", file.FileName);
            Assert.Equal("text/plain", file.ContentType);
            Assert.Equal(1024, file.Size);
            Assert.Equal(2, file.Version);
            Assert.Equal(parentId, file.ParentVersionId);
            Assert.Equal(5, file.ChunkCount);
            Assert.Equal("abc123", file.Hash);
            Assert.Equal(now, file.CreatedAt);
            Assert.Equal(now, file.LastModifiedAt);
            Assert.Equal(now, file.LastSyncedAt);
            Assert.Equal(1, file.OwnerId);
            Assert.False(file.IsDeleted);
            Assert.Equal("/storage/test.txt", file.StoragePath);
        }

        [Fact]
        public void FileMetadata_Version_ShouldDefaultToOne()
        {
            // Act
            var file = new FileMetadata
            {
                FileName = "test.txt"
            };

            // Assert
            Assert.Equal(1, file.Version);
        }

        [Fact]
        public void FileMetadata_IsDeleted_ShouldDefaultToFalse()
        {
            // Act
            var file = new FileMetadata
            {
                FileName = "test.txt"
            };

            // Assert
            Assert.False(file.IsDeleted);
        }

        [Fact]
        public void FileMetadata_ShouldSupportLargeFileSizes()
        {
            // Arrange - 50GB in bytes
            long fiftyGigabytes = 50L * 1024 * 1024 * 1024;

            // Act
            var file = new FileMetadata
            {
                FileName = "large.bin",
                Size = fiftyGigabytes
            };

            // Assert
            Assert.Equal(fiftyGigabytes, file.Size);
        }

        [Fact]
        public void FileMetadata_ParentVersionId_ShouldBeNullable()
        {
            // Act
            var file = new FileMetadata
            {
                FileName = "test.txt",
                ParentVersionId = null
            };

            // Assert
            Assert.Null(file.ParentVersionId);
        }

        [Fact]
        public void FileMetadata_LastSyncedAt_ShouldBeNullable()
        {
            // Act
            var file = new FileMetadata
            {
                FileName = "test.txt",
                LastSyncedAt = null
            };

            // Assert
            Assert.Null(file.LastSyncedAt);
        }

        [Fact]
        public void FileMetadata_NavigationProperties_ShouldBeInitialized()
        {
            // Act
            var file = new FileMetadata();

            // Assert
            Assert.NotNull(file.Chunks);
            Assert.NotNull(file.Permissions);
            Assert.NotNull(file.SyncEvents);
            Assert.IsAssignableFrom<System.Collections.Generic.ICollection<FileChunk>>(file.Chunks);
            Assert.IsAssignableFrom<System.Collections.Generic.ICollection<FilePermission>>(file.Permissions);
            Assert.IsAssignableFrom<System.Collections.Generic.ICollection<SyncEvent>>(file.SyncEvents);
        }

        [Fact]
        public void FileMetadata_ShouldAllowAddingChunks()
        {
            // Arrange
            var file = new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = "test.txt"
            };

            var chunk = new FileChunk
            {
                Id = Guid.NewGuid(),
                FileMetadataId = file.Id,
                ChunkIndex = 0,
                Size = 1024,
                Hash = "hash1",
                StoragePath = "path1"
            };

            // Act
            file.Chunks.Add(chunk);

            // Assert
            Assert.Single(file.Chunks);
            Assert.Equal(chunk, file.Chunks.First());
        }

        [Fact]
        public void FileMetadata_ShouldAllowAddingPermissions()
        {
            // Arrange
            var file = new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = "test.txt"
            };

            var permission = new FilePermission
            {
                Id = Guid.NewGuid(),
                FileMetadataId = file.Id,
                UserId = 1,
                PermissionType = PermissionType.Read,
                GrantedAt = DateTime.UtcNow,
                GrantedBy = 2
            };

            // Act
            file.Permissions.Add(permission);

            // Assert
            Assert.Single(file.Permissions);
            Assert.Equal(permission, file.Permissions.First());
        }
    }
}
