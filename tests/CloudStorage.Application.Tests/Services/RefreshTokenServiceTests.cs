using System;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public class RefreshTokenServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly RefreshTokenService _refreshTokenService;

        public RefreshTokenServiceTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ApplicationDbContext(options);

            var configData = new Dictionary<string, string>
            {
                {"RefreshToken:ExpirationDays", "7"}
            };

            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(configData!)
                .Build();

            _refreshTokenService = new RefreshTokenService(_context, _configuration);

            // Seed a test user
            _context.Users.Add(new User
            {
                Id = 1,
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hash",
                CreatedAt = DateTime.UtcNow
            });
            _context.SaveChanges();
        }

        [Fact]
        public async Task GenerateRefreshTokenAsync_ShouldCreateToken()
        {
            // Arrange
            var userId = 1;

            // Act
            var result = await _refreshTokenService.GenerateRefreshTokenAsync(userId);

            // Assert
            Assert.NotNull(result);
            Assert.NotEqual(Guid.Empty, result.Id);
            Assert.NotEmpty(result.Token);
            Assert.Equal(userId, result.UserId);
            Assert.False(result.IsRevoked);
            Assert.True(result.ExpiresAt > DateTime.UtcNow);
        }

        [Fact]
        public async Task GenerateRefreshTokenAsync_ShouldSetCorrectExpiration()
        {
            // Arrange
            var userId = 1;
            var now = DateTime.UtcNow;

            // Act
            var result = await _refreshTokenService.GenerateRefreshTokenAsync(userId);

            // Assert
            var expectedExpiration = now.AddDays(7);
            Assert.True(result.ExpiresAt >= expectedExpiration.AddSeconds(-5));
            Assert.True(result.ExpiresAt <= expectedExpiration.AddSeconds(5));
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_WithValidToken_ShouldReturnToken()
        {
            // Arrange
            var token = await _refreshTokenService.GenerateRefreshTokenAsync(1);

            // Act
            var result = await _refreshTokenService.ValidateRefreshTokenAsync(token.Token);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(token.Id, result.Id);
            Assert.NotNull(result.User);
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_WithInvalidToken_ShouldReturnNull()
        {
            // Act
            var result = await _refreshTokenService.ValidateRefreshTokenAsync("invalid-token");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_WithRevokedToken_ShouldReturnNull()
        {
            // Arrange
            var token = await _refreshTokenService.GenerateRefreshTokenAsync(1);
            await _refreshTokenService.RevokeTokenAsync(token.Token);

            // Act
            var result = await _refreshTokenService.ValidateRefreshTokenAsync(token.Token);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_WithExpiredToken_ShouldRevokeAndReturnNull()
        {
            // Arrange
            var expiredToken = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = 1,
                Token = "expired-token",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                ExpiresAt = DateTime.UtcNow.AddDays(-1),
                IsRevoked = false
            };
            _context.RefreshTokens.Add(expiredToken);
            await _context.SaveChangesAsync();

            // Act
            var result = await _refreshTokenService.ValidateRefreshTokenAsync(expiredToken.Token);

            // Assert
            Assert.Null(result);
            
            var token = await _context.RefreshTokens.FindAsync(expiredToken.Id);
            Assert.True(token!.IsRevoked);
        }

        [Fact]
        public async Task RevokeTokenAsync_ShouldMarkTokenAsRevoked()
        {
            // Arrange
            var token = await _refreshTokenService.GenerateRefreshTokenAsync(1);
            var beforeRevoke = DateTime.UtcNow;

            // Act
            await _refreshTokenService.RevokeTokenAsync(token.Token);

            // Assert
            var revokedToken = await _context.RefreshTokens.FindAsync(token.Id);
            Assert.True(revokedToken!.IsRevoked);
            Assert.NotNull(revokedToken.RevokedAt);
            Assert.True(revokedToken.RevokedAt >= beforeRevoke);
        }

        [Fact]
        public async Task RevokeTokenAsync_WithNonExistentToken_ShouldNotThrow()
        {
            // Act & Assert
            await _refreshTokenService.RevokeTokenAsync("non-existent-token");
            // Should complete without exception
        }

        [Fact]
        public async Task RevokeAllUserTokensAsync_ShouldRevokeAllTokens()
        {
            // Arrange
            var userId = 1;
            var token1 = await _refreshTokenService.GenerateRefreshTokenAsync(userId);
            var token2 = await _refreshTokenService.GenerateRefreshTokenAsync(userId);
            var token3 = await _refreshTokenService.GenerateRefreshTokenAsync(userId);

            // Act
            await _refreshTokenService.RevokeAllUserTokensAsync(userId);

            // Assert
            var userTokens = await _context.RefreshTokens
                .Where(t => t.UserId == userId)
                .ToListAsync();

            Assert.All(userTokens, token => Assert.True(token.IsRevoked));
            Assert.All(userTokens, token => Assert.NotNull(token.RevokedAt));
        }

        [Fact]
        public async Task GenerateRefreshTokenAsync_ShouldGenerateUniqueTokens()
        {
            // Arrange & Act
            var token1 = await _refreshTokenService.GenerateRefreshTokenAsync(1);
            var token2 = await _refreshTokenService.GenerateRefreshTokenAsync(1);

            // Assert
            Assert.NotEqual(token1.Token, token2.Token);
            Assert.NotEqual(token1.Id, token2.Id);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
