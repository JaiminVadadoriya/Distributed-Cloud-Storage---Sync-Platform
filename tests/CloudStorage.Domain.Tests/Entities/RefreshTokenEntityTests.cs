using System;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class RefreshTokenEntityTests
    {
        [Fact]
        public void RefreshToken_ShouldInitializeWithDefaultValues()
        {
            // Arrange & Act
            var token = new RefreshToken();

            // Assert
            Assert.Equal(Guid.Empty, token.Id);
            Assert.Equal(string.Empty, token.Token);
            Assert.Equal(0, token.UserId);
            Assert.Null(token.User);
            Assert.Equal(default, token.ExpiresAt);
            Assert.Equal(default, token.CreatedAt);
            Assert.False(token.IsRevoked);
            Assert.Null(token.RevokedAt);
        }

        [Fact]
        public void RefreshToken_ShouldSetPropertiesCorrectly()
        {
            // Arrange
            var id = Guid.NewGuid();
            var userId = 1;
            var tokenString = "some-random-token-string";
            var now = DateTime.UtcNow;
            var expires = now.AddDays(7);
            
            // Act
            var token = new RefreshToken
            {
                Id = id,
                UserId = userId,
                Token = tokenString,
                CreatedAt = now,
                ExpiresAt = expires,
                IsRevoked = true,
                RevokedAt = now.AddMinutes(5)
            };

            // Assert
            Assert.Equal(id, token.Id);
            Assert.Equal(userId, token.UserId);
            Assert.Equal(tokenString, token.Token);
            Assert.Equal(now, token.CreatedAt);
            Assert.Equal(expires, token.ExpiresAt);
            Assert.True(token.IsRevoked);
            Assert.Equal(now.AddMinutes(5), token.RevokedAt);
        }

        [Fact]
        public void RefreshToken_ShouldAssociateWithUser()
        {
            // Arrange
            var user = new User { Id = 1, Username = "testuser" };
            
            // Act
            var token = new RefreshToken
            {
                UserId = user.Id,
                User = user
            };

            // Assert
            Assert.Equal(user.Id, token.UserId);
            Assert.Same(user, token.User);
        }
    }
}
