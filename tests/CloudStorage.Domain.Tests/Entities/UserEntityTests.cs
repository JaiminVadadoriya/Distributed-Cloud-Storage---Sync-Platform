using System;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class UserEntityTests
    {
        [Fact]
        public void User_ShouldInitializeWithDefaultValues()
        {
            // Act
            var user = new User();

            // Assert
            Assert.Equal(0, user.Id);
            Assert.Equal(string.Empty, user.Username);
            Assert.Equal(string.Empty, user.Email);
            Assert.Equal(string.Empty, user.PasswordHash);
            Assert.False(user.EmailVerified);
            Assert.True(user.IsActive);
            Assert.Null(user.LastLoginAt);
            Assert.NotNull(user.RefreshTokens);
            Assert.Empty(user.RefreshTokens);
            Assert.NotNull(user.Devices);
            Assert.Empty(user.Devices);
            Assert.NotNull(user.FilePermissions);
            Assert.Empty(user.FilePermissions);
        }

        [Fact]
        public void User_ShouldSetPropertiesCorrectly()
        {
            // Arrange
            var now = DateTime.UtcNow;

            // Act
            var user = new User
            {
                Id = 1,
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                EmailVerified = true,
                IsActive = true,
                LastLoginAt = now,
                CreatedAt = now
            };

            // Assert
            Assert.Equal(1, user.Id);
            Assert.Equal("testuser", user.Username);
            Assert.Equal("test@example.com", user.Email);
            Assert.Equal("hashedpassword", user.PasswordHash);
            Assert.True(user.EmailVerified);
            Assert.True(user.IsActive);
            Assert.Equal(now, user.LastLoginAt);
            Assert.Equal(now, user.CreatedAt);
        }

        [Fact]
        public void User_ShouldAllowNullableLastLoginAt()
        {
            // Act
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                LastLoginAt = null
            };

            // Assert
            Assert.Null(user.LastLoginAt);
        }

        [Fact]
        public void User_IsActive_ShouldDefaultToTrue()
        {
            // Act
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com"
            };

            // Assert
            Assert.True(user.IsActive);
        }

        [Fact]
        public void User_EmailVerified_ShouldDefaultToFalse()
        {
            // Act
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com"
            };

            // Assert
            Assert.False(user.EmailVerified);
        }

        [Fact]
        public void User_NavigationProperties_ShouldBeInitialized()
        {
            // Act
            var user = new User();

            // Assert
            Assert.NotNull(user.RefreshTokens);
            Assert.NotNull(user.Devices);
            Assert.NotNull(user.FilePermissions);
            Assert.IsAssignableFrom<System.Collections.Generic.ICollection<RefreshToken>>(user.RefreshTokens);
            Assert.IsAssignableFrom<System.Collections.Generic.ICollection<Device>>(user.Devices);
            Assert.IsAssignableFrom<System.Collections.Generic.ICollection<FilePermission>>(user.FilePermissions);
        }
    }
}
