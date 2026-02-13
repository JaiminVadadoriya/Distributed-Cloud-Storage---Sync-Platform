using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class RefreshTokenServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly RefreshTokenService _service;
        private readonly User _testUser;

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

            _service = new RefreshTokenService(_context, _configuration);

            // Create a test user
            _testUser = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(_testUser);
            _context.SaveChanges();
        }

        [Fact]
        public async Task GenerateRefreshTokenAsync_ShouldCreateValidToken()
        {
            // Act
            var result = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Assert
            Assert.NotNull(result);
            Assert.NotEqual(Guid.Empty, result.Id);
            Assert.NotEmpty(result.Token);
            Assert.Equal(_testUser.Id, result.UserId);
            Assert.False(result.IsRevoked);
            Assert.Null(result.RevokedAt);
        }

        [Fact]
        public async Task GenerateRefreshTokenAsync_ShouldSetCorrectExpiration()
        {
            // Arrange
            var beforeGeneration = DateTime.UtcNow;

            // Act
            var result = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Assert
            var afterGeneration = DateTime.UtcNow;
            var expectedExpiration = beforeGeneration.AddDays(7);
            
            Assert.True(result.ExpiresAt >= expectedExpiration.AddSeconds(-1));
            Assert.True(result.ExpiresAt <= afterGeneration.AddDays(7).AddSeconds(1));
        }

        [Fact]
        public async Task GenerateRefreshTokenAsync_ShouldGenerateUniqueTokens()
        {
            // Act
            var token1 = await _service.GenerateRefreshTokenAsync(_testUser.Id);
            var token2 = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Assert
            Assert.NotEqual(token1.Token, token2.Token);
            Assert.NotEqual(token1.Id, token2.Id);
        }

        [Fact]
        public async Task GenerateRefreshTokenAsync_ShouldPersistToDatabase()
        {
            // Act
            var result = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Assert
            var savedToken = await _context.RefreshTokens.FindAsync(result.Id);
            Assert.NotNull(savedToken);
            Assert.Equal(result.Token, savedToken.Token);
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_WithValidToken_ShouldReturnToken()
        {
            // Arrange
            var token = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Act
            var result = await _service.ValidateRefreshTokenAsync(token.Token);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(token.Id, result.Id);
            Assert.NotNull(result.User);
            Assert.Equal(_testUser.Username, result.User.Username);
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_WithNonExistentToken_ShouldReturnNull()
        {
            // Act
            var result = await _service.ValidateRefreshTokenAsync("nonexistent-token");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_WithRevokedToken_ShouldReturnNull()
        {
            // Arrange
            var token = await _service.GenerateRefreshTokenAsync(_testUser.Id);
            await _service.RevokeTokenAsync(token.Token);

            // Act
            var result = await _service.ValidateRefreshTokenAsync(token.Token);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_WithExpiredToken_ShouldReturnNullAndRevokeToken()
        {
            // Arrange
            var token = await _service.GenerateRefreshTokenAsync(_testUser.Id);
            
            // Manually expire the token
            var dbToken = await _context.RefreshTokens.FindAsync(token.Id);
            dbToken!.ExpiresAt = DateTime.UtcNow.AddDays(-1);
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.ValidateRefreshTokenAsync(token.Token);

            // Assert
            Assert.Null(result);
            
            // Verify token was revoked
            var revokedToken = await _context.RefreshTokens.FindAsync(token.Id);
            Assert.True(revokedToken!.IsRevoked);
            Assert.NotNull(revokedToken.RevokedAt);
        }

        [Fact]
        public async Task RevokeTokenAsync_ShouldRevokeToken()
        {
            // Arrange
            var token = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Act
            await _service.RevokeTokenAsync(token.Token);

            // Assert
            var revokedToken = await _context.RefreshTokens.FindAsync(token.Id);
            Assert.True(revokedToken!.IsRevoked);
            Assert.NotNull(revokedToken.RevokedAt);
        }

        [Fact]
        public async Task RevokeTokenAsync_WithNonExistentToken_ShouldNotThrow()
        {
            // Act & Assert
            await _service.RevokeTokenAsync("nonexistent-token");
            // Should not throw exception
        }

        [Fact]
        public async Task RevokeTokenAsync_WithAlreadyRevokedToken_ShouldNotUpdateRevokedAt()
        {
            // Arrange
            var token = await _service.GenerateRefreshTokenAsync(_testUser.Id);
            await _service.RevokeTokenAsync(token.Token);
            
            var firstRevokedToken = await _context.RefreshTokens.FindAsync(token.Id);
            var firstRevokedAt = firstRevokedToken!.RevokedAt;

            // Wait a moment to ensure timestamp would be different
            await Task.Delay(10);

            // Act
            await _service.RevokeTokenAsync(token.Token);

            // Assert
            var secondRevokedToken = await _context.RefreshTokens.FindAsync(token.Id);
            Assert.Equal(firstRevokedAt, secondRevokedToken!.RevokedAt);
        }

        [Fact]
        public async Task RevokeAllUserTokensAsync_ShouldRevokeAllUserTokens()
        {
            // Arrange
            var token1 = await _service.GenerateRefreshTokenAsync(_testUser.Id);
            var token2 = await _service.GenerateRefreshTokenAsync(_testUser.Id);
            var token3 = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Act
            await _service.RevokeAllUserTokensAsync(_testUser.Id);

            // Assert
            var allTokens = await _context.RefreshTokens
                .Where(t => t.UserId == _testUser.Id)
                .ToListAsync();

            Assert.All(allTokens, t => Assert.True(t.IsRevoked));
            Assert.All(allTokens, t => Assert.NotNull(t.RevokedAt));
        }

        [Fact]
        public async Task RevokeAllUserTokensAsync_ShouldNotRevokeOtherUsersTokens()
        {
            // Arrange
            var otherUser = new User
            {
                Username = "otheruser",
                Email = "other@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(otherUser);
            await _context.SaveChangesAsync();

            var testUserToken = await _service.GenerateRefreshTokenAsync(_testUser.Id);
            var otherUserToken = await _service.GenerateRefreshTokenAsync(otherUser.Id);

            // Act
            await _service.RevokeAllUserTokensAsync(_testUser.Id);

            // Assert
            var testToken = await _context.RefreshTokens.FindAsync(testUserToken.Id);
            var otherToken = await _context.RefreshTokens.FindAsync(otherUserToken.Id);

            Assert.True(testToken!.IsRevoked);
            Assert.False(otherToken!.IsRevoked);
        }

        [Fact]
        public async Task RevokeAllUserTokensAsync_ShouldNotRevokeAlreadyRevokedTokens()
        {
            // Arrange
            var token1 = await _service.GenerateRefreshTokenAsync(_testUser.Id);
            await _service.RevokeTokenAsync(token1.Token);
            
            var firstRevokedToken = await _context.RefreshTokens.FindAsync(token1.Id);
            var firstRevokedAt = firstRevokedToken!.RevokedAt;

            var token2 = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Wait a moment
            await Task.Delay(10);

            // Act
            await _service.RevokeAllUserTokensAsync(_testUser.Id);

            // Assert
            var token1AfterRevoke = await _context.RefreshTokens.FindAsync(token1.Id);
            Assert.Equal(firstRevokedAt, token1AfterRevoke!.RevokedAt);
        }

        [Fact]
        public async Task ValidateRefreshTokenAsync_ShouldIncludeUserInformation()
        {
            // Arrange
            var token = await _service.GenerateRefreshTokenAsync(_testUser.Id);

            // Act
            var result = await _service.ValidateRefreshTokenAsync(token.Token);

            // Assert
            Assert.NotNull(result);
            Assert.NotNull(result.User);
            Assert.Equal(_testUser.Id, result.User.Id);
            Assert.Equal(_testUser.Username, result.User.Username);
            Assert.Equal(_testUser.Email, result.User.Email);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
