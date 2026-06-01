using System;
using System.Collections.Generic;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Enums;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class UncoveredEntitiesTests
    {
        [Fact]
        public void Folder_ShouldInitializeAndSetProperties()
        {
            // Arrange
            var now = DateTime.UtcNow;
            var owner = new User { Email = "owner@test.com" };
            var parent = new Folder { Name = "Parent" };
            var subFolder = new Folder { Name = "Sub" };
            var file = new FileMetadata { FileName = "test.txt" };
            var permission = new FolderPermission();

            // Act
            var folder = new Folder
            {
                Name = "MyFolder",
                LastModifiedAt = now,
                OwnerId = 42,
                Owner = owner,
                ParentFolderId = Guid.NewGuid(),
                ParentFolder = parent,
                SubFolders = new List<Folder> { subFolder },
                Files = new List<FileMetadata> { file },
                Permissions = new List<FolderPermission> { permission }
            };

            // Assert
            Assert.Equal("MyFolder", folder.Name);
            Assert.Equal(now, folder.LastModifiedAt);
            Assert.Equal(42, folder.OwnerId);
            Assert.Same(owner, folder.Owner);
            Assert.NotNull(folder.ParentFolderId);
            Assert.Same(parent, folder.ParentFolder);
            Assert.Contains(subFolder, folder.SubFolders);
            Assert.Contains(file, folder.Files);
            Assert.Contains(permission, folder.Permissions);
        }

        [Fact]
        public void FolderPermission_ShouldSetProperties()
        {
            // Arrange
            var folder = new Folder { Name = "TestFolder" };
            var user = new User { Email = "user@test.com" };
            var folderId = Guid.NewGuid();
            var grantedAt = DateTime.UtcNow;

            // Act
            var permission = new FolderPermission
            {
                FolderId = folderId,
                Folder = folder,
                UserId = 10,
                User = user,
                PermissionType = PermissionType.Read,
                GrantedAt = grantedAt,
                GrantedBy = 1
            };

            // Assert
            Assert.Equal(folderId, permission.FolderId);
            Assert.Same(folder, permission.Folder);
            Assert.Equal(10, permission.UserId);
            Assert.Same(user, permission.User);
            Assert.Equal(PermissionType.Read, permission.PermissionType);
            Assert.Equal(grantedAt, permission.GrantedAt);
            Assert.Equal(1, permission.GrantedBy);
        }

        [Fact]
        public void Notification_ShouldSetProperties()
        {
            // Arrange
            var user = new User { Email = "user@test.com" };
            var relatedId = Guid.NewGuid();

            // Act
            var notification = new Notification
            {
                UserId = 5,
                User = user,
                Type = NotificationType.FileShared,
                Title = "File Shared",
                Message = "Someone shared a file with you",
                IsRead = true,
                RelatedEntityId = relatedId
            };

            // Assert
            Assert.Equal(5, notification.UserId);
            Assert.Same(user, notification.User);
            Assert.Equal(NotificationType.FileShared, notification.Type);
            Assert.Equal("File Shared", notification.Title);
            Assert.Equal("Someone shared a file with you", notification.Message);
            Assert.True(notification.IsRead);
            Assert.Equal(relatedId, notification.RelatedEntityId);
        }

        [Fact]
        public void PasswordResetToken_ShouldSetProperties()
        {
            // Arrange
            var user = new User { Email = "user@test.com" };
            var expires = DateTime.UtcNow.AddHours(1);
            var usedAt = DateTime.UtcNow;

            // Act
            var token = new PasswordResetToken
            {
                UserId = 123,
                User = user,
                TokenHash = "hash123",
                ExpiresAt = expires,
                IsUsed = true,
                UsedAt = usedAt
            };

            // Assert
            Assert.Equal(123, token.UserId);
            Assert.Same(user, token.User);
            Assert.Equal("hash123", token.TokenHash);
            Assert.Equal(expires, token.ExpiresAt);
            Assert.True(token.IsUsed);
            Assert.Equal(usedAt, token.UsedAt);
        }

        [Fact]
        public void StorageObjectLifecycle_ShouldSetProperties()
        {
            // Arrange
            var fileId = Guid.NewGuid();
            var accessed = DateTime.UtcNow;

            // Act
            var lifecycle = new StorageObjectLifecycle
            {
                FileId = fileId,
                ObjectKey = "key123",
                ProviderName = "S3",
                CurrentTier = StorageTier.Archive,
                LastAccessedAt = accessed
            };

            // Assert
            Assert.Equal(fileId, lifecycle.FileId);
            Assert.Equal("key123", lifecycle.ObjectKey);
            Assert.Equal("S3", lifecycle.ProviderName);
            Assert.Equal(StorageTier.Archive, lifecycle.CurrentTier);
            Assert.Equal(accessed, lifecycle.LastAccessedAt);
        }

        [Fact]
        public void DbObjectMetadata_ShouldSetProperties()
        {
            // Arrange
            var objectId = Guid.NewGuid();
            var modified = DateTime.UtcNow;

            // Act
            var meta = new DbObjectMetadata
            {
                ObjectId = objectId,
                Key = "metaKey",
                Size = 1024,
                RootHash = "hashRoot",
                ChunkHashesJson = "[\"h1\",\"h2\"]",
                TenantId = "tenant1",
                CurrentTier = "Cool",
                TagsJson = "{\"tag1\":\"val1\"}",
                LastModified = modified
            };

            // Assert
            Assert.Equal(objectId, meta.ObjectId);
            Assert.Equal("metaKey", meta.Key);
            Assert.Equal(1024, meta.Size);
            Assert.Equal("hashRoot", meta.RootHash);
            Assert.Equal("[\"h1\",\"h2\"]", meta.ChunkHashesJson);
            Assert.Equal("tenant1", meta.TenantId);
            Assert.Equal("Cool", meta.CurrentTier);
            Assert.Equal("{\"tag1\":\"val1\"}", meta.TagsJson);
            Assert.Equal(modified, meta.LastModified);
        }

        [Fact]
        public void ActivityLog_ShouldSetProperties()
        {
            // Arrange
            var user = new User { Email = "user@test.com" };
            var timestamp = DateTime.UtcNow;

            // Act
            var log = new ActivityLog
            {
                UserId = 99,
                Action = "UPLOAD",
                EntityType = "FILE",
                EntityId = "entity-guid-string",
                Details = "Uploaded file",
                IpAddress = "127.0.0.1",
                Timestamp = timestamp,
                User = user
            };

            // Assert
            Assert.Equal(99, log.UserId);
            Assert.Equal("UPLOAD", log.Action);
            Assert.Equal("FILE", log.EntityType);
            Assert.Equal("entity-guid-string", log.EntityId);
            Assert.Equal("Uploaded file", log.Details);
            Assert.Equal("127.0.0.1", log.IpAddress);
            Assert.Equal(timestamp, log.Timestamp);
            Assert.Same(user, log.User);
        }
    }
}
