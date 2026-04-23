using System;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class FilePermissionEntityTests
    {
        [Fact]
        public void FilePermission_ShouldInitializeWithDefaultValues()
        {
            // Arrange & Act
            var permission = new FilePermission();

            // Assert
            Assert.Equal(Guid.Empty, permission.Id);
            Assert.Equal(Guid.Empty, permission.FileMetadataId);
            Assert.Null(permission.FileMetadata);
            Assert.Equal(0, permission.UserId);
            Assert.Null(permission.User);
            Assert.Equal(PermissionType.Read, permission.PermissionType); // Default enum value
            Assert.Equal(default, permission.GrantedAt);
            Assert.Equal(0, permission.GrantedBy);
        }

        [Fact]
        public void FilePermission_ShouldSetPropertiesCorrectly()
        {
            // Arrange
            var id = Guid.NewGuid();
            var fileId = Guid.NewGuid();
            var userId = 10;
            var grantedBy = 1;
            var now = DateTime.UtcNow;

            // Act
            var permission = new FilePermission
            {
                Id = id,
                FileMetadataId = fileId,
                UserId = userId,
                PermissionType = PermissionType.Write,
                GrantedAt = now,
                GrantedBy = grantedBy
            };

            // Assert
            Assert.Equal(id, permission.Id);
            Assert.Equal(fileId, permission.FileMetadataId);
            Assert.Equal(userId, permission.UserId);
            Assert.Equal(PermissionType.Write, permission.PermissionType);
            Assert.Equal(now, permission.GrantedAt);
            Assert.Equal(grantedBy, permission.GrantedBy);
        }

        [Fact]
        public void FilePermission_ShouldSupportAllPermissionTypes()
        {
            // Arrange
            var read = new FilePermission { PermissionType = PermissionType.Read };
            var write = new FilePermission { PermissionType = PermissionType.Write };
            var owner = new FilePermission { PermissionType = PermissionType.Owner };

            // Assert
            Assert.Equal(PermissionType.Read, read.PermissionType);
            Assert.Equal(PermissionType.Write, write.PermissionType);
            Assert.Equal(PermissionType.Owner, owner.PermissionType);
        }

        [Fact]
        public void FilePermission_ShouldAssociateWithUserAndFile()
        {
            // Arrange
            var user = new User { Id = 5, Username = "viewer" };
            var file = new FileMetadata { Id = Guid.NewGuid(), FileName = "doc.pdf" };

            // Act
            var permission = new FilePermission
            {
                UserId = user.Id,
                User = user,
                FileMetadataId = file.Id,
                FileMetadata = file
            };

            // Assert
            Assert.Equal(user.Id, permission.UserId);
            Assert.Same(user, permission.User);
            Assert.Equal(file.Id, permission.FileMetadataId);
            Assert.Same(file, permission.FileMetadata);
        }
    }
}
