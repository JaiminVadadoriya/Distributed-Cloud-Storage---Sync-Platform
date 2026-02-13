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
    public class AuthServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IRefreshTokenService _refreshTokenService;
        private readonly AuthService _authService;

        public AuthServiceTests()
        {
            // Setup in-memory database
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ApplicationDbContext(options);

            // Setup configuration
            var configData = new Dictionary<string, string>
            {
                {"Jwt:Key", "ThisIsASuperSecretKeyThatShouldBeLongEnoughForHS256Algorithm"},
                {"Jwt:Issuer", "TestIssuer"},
                {"Jwt:Audience", "TestAudience"},
                {"Jwt:ExpirationMinutes", "15"},
                {"RefreshToken:ExpirationDays", "7"}
            };

            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(configData!)
                .Build();

            _refreshTokenService = new RefreshTokenService(_context, _configuration);
            _authService = new AuthService(_context, _configuration, _refreshTokenService);
        }

        [Fact]
        public async Task RegisterAsync_WithValidData_ShouldCreateUser()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com"
            };

            // Act
            var result = await _authService.RegisterAsync(user, "password123");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("testuser", result.Username);
            Assert.Equal("test@example.com", result.Email);
            Assert.NotNull(result.PasswordHash);
            Assert.True(result.IsActive);
            Assert.False(result.EmailVerified);
        }

        [Fact]
        public async Task RegisterAsync_WithDuplicateUsername_ShouldThrowException()
        {
            // Arrange
            var user1 = new User { Username = "testuser", Email = "test1@example.com" };
            await _authService.RegisterAsync(user1, "password123");

            var user2 = new User { Username = "testuser", Email = "test2@example.com" };

            // Act & Assert
            await Assert.ThrowsAsync<Exception>(() => _authService.RegisterAsync(user2, "password123"));
        }

        [Fact]
        public async Task RegisterAsync_WithDuplicateEmail_ShouldThrowException()
        {
            // Arrange
            var user1 = new User { Username = "user1", Email = "test@example.com" };
            await _authService.RegisterAsync(user1, "password123");

            var user2 = new User { Username = "user2", Email = "test@example.com" };

            // Act & Assert
            await Assert.ThrowsAsync<Exception>(() => _authService.RegisterAsync(user2, "password123"));
        }

        [Fact]
        public async Task LoginAsync_WithValidCredentials_ShouldReturnTokens()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");

            // Act
            var result = await _authService.LoginAsync("testuser", "password123");

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.AccessToken);
            Assert.NotEmpty(result.RefreshToken);
            Assert.Equal("Bearer", result.TokenType);
            Assert.True(result.ExpiresIn > 0);
        }

        [Fact]
        public async Task LoginAsync_WithInvalidPassword_ShouldReturnNull()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");

            // Act
            var result = await _authService.LoginAsync("testuser", "wrongpassword");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task LoginAsync_WithNonExistentUser_ShouldReturnNull()
        {
            // Act
            var result = await _authService.LoginAsync("nonexistent", "password123");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task LoginAsync_ShouldUpdateLastLoginTime()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");
            var beforeLogin = DateTime.UtcNow;

            // Act
            await _authService.LoginAsync("testuser", "password123");

            // Assert
            var updatedUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "testuser");
            Assert.NotNull(updatedUser!.LastLoginAt);
            Assert.True(updatedUser.LastLoginAt >= beforeLogin);
        }

        [Fact]
        public async Task RefreshTokenAsync_WithValidToken_ShouldReturnNewTokens()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");
            var loginResult = await _authService.LoginAsync("testuser", "password123");

            // Act
            var result = await _authService.RefreshTokenAsync(loginResult!.RefreshToken);

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.AccessToken);
            Assert.NotEmpty(result.RefreshToken);
            Assert.NotEqual(loginResult.AccessToken, result.AccessToken);
            Assert.NotEqual(loginResult.RefreshToken, result.RefreshToken);
        }

        [Fact]
        public async Task RefreshTokenAsync_WithInvalidToken_ShouldReturnNull()
        {
            // Act
            var result = await _authService.RefreshTokenAsync("invalid-token");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task LogoutAsync_ShouldRevokeRefreshToken()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");
            var loginResult = await _authService.LoginAsync("testuser", "password123");

            // Act
            await _authService.LogoutAsync(loginResult!.RefreshToken);

            // Assert
            var token = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.Token == loginResult.RefreshToken);
            Assert.True(token!.IsRevoked);
            Assert.NotNull(token.RevokedAt);
        }

        [Fact]
        public async Task RequestPasswordResetAsync_WithValidEmail_ShouldReturnToken()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");

            // Act
            var result = await _authService.RequestPasswordResetAsync("test@example.com");

            // Assert
            Assert.NotEmpty(result);
        }

        [Fact]
        public async Task RequestPasswordResetAsync_WithNonExistentEmail_ShouldReturnGenericMessage()
        {
            // Act
            var result = await _authService.RequestPasswordResetAsync("nonexistent@example.com");

            // Assert
            Assert.NotEmpty(result);
            // Should not reveal that the email doesn't exist
            Assert.Contains("If the email exists", result);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
