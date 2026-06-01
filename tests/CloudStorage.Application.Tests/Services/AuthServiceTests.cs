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
    /// <summary>
    /// A fake email service for testing that records calls.
    /// </summary>
    public class FakeEmailService : IEmailService
    {
        public int SendCount { get; private set; }
        public string? LastEmail { get; private set; }
        public string? LastToken { get; private set; }

        public Task SendPasswordResetEmailAsync(string toEmail, string resetToken)
        {
            SendCount++;
            LastEmail = toEmail;
            LastToken = resetToken;
            return Task.CompletedTask;
        }
    }

    public class AuthServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IRefreshTokenService _refreshTokenService;
        private readonly FakeEmailService _emailService;
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
                {"RefreshToken:ExpirationDays", "7"},
                {"PasswordReset:TokenExpirationMinutes", "60"},
                {"PasswordReset:ResetUrl", "http://localhost:4200/auth/reset-password"}
            };

            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(configData!)
                .Build();

            _refreshTokenService = new RefreshTokenService(_context, _configuration);
            _emailService = new FakeEmailService();
            _authService = new AuthService(_context, _configuration, _refreshTokenService, _emailService);
        }

        // ========================
        // Register Tests
        // ========================

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

        // ========================
        // Login Tests
        // ========================

        [Fact]
        public async Task LoginAsync_WithValidCredentials_ShouldReturnTokens()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");

            // Act - Test with Username
            var resultWithUsername = await _authService.LoginAsync("testuser", "password123");

            // Assert
            Assert.NotNull(resultWithUsername);
            Assert.NotEmpty(resultWithUsername.AccessToken);

            // Act - Test with Email
            var resultWithEmail = await _authService.LoginAsync("test@example.com", "password123");

            // Assert
            Assert.NotNull(resultWithEmail);
            Assert.NotEmpty(resultWithEmail.AccessToken);
        }

        [Fact]
        public async Task LoginAsync_WithInvalidPassword_ShouldReturnNull()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");

            // Act
            var result = await _authService.LoginAsync("test@example.com", "wrongpassword");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task LoginAsync_WithNonExistentUser_ShouldReturnNull()
        {
            // Act
            var result = await _authService.LoginAsync("nonexistent@example.com", "password123");

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
            await _authService.LoginAsync("test@example.com", "password123");

            // Assert
            var updatedUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "testuser");
            Assert.NotNull(updatedUser!.LastLoginAt);
            Assert.True(updatedUser.LastLoginAt >= beforeLogin);
        }

        // ========================
        // Refresh Token Tests
        // ========================

        [Fact]
        public async Task RefreshTokenAsync_WithValidToken_ShouldReturnNewTokens()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");
            var loginResult = await _authService.LoginAsync("test@example.com", "password123");

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

        // ========================
        // Logout Tests
        // ========================

        [Fact]
        public async Task LogoutAsync_ShouldRevokeRefreshToken()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");
            var loginResult = await _authService.LoginAsync("test@example.com", "password123");

            // Act
            await _authService.LogoutAsync(loginResult!.RefreshToken);

            // Assert
            var dbUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");
            var token = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.UserId == dbUser!.Id);
            Assert.True(token!.IsRevoked);
            Assert.NotNull(token.RevokedAt);
        }

        // ========================
        // Password Reset Request Tests
        // ========================

        [Fact]
        public async Task RequestPasswordResetAsync_WithValidEmail_ShouldSaveTokenAndSendEmail()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");

            // Act
            var result = await _authService.RequestPasswordResetAsync("test@example.com");

            // Assert
            Assert.Contains("If the email exists", result);
            Assert.Equal(1, _emailService.SendCount);
            Assert.Equal("test@example.com", _emailService.LastEmail);
            Assert.NotNull(_emailService.LastToken);

            // Verify token was saved in DB
            var savedTokens = await _context.PasswordResetTokens.Where(t => t.UserId == user.Id).ToListAsync();
            Assert.Single(savedTokens);
            Assert.False(savedTokens[0].IsUsed);
        }

        [Fact]
        public async Task RequestPasswordResetAsync_WithNonExistentEmail_ShouldReturnGenericMessageWithoutSendingEmail()
        {
            // Act
            var result = await _authService.RequestPasswordResetAsync("nonexistent@example.com");

            // Assert — same message, but no email sent and no token saved
            Assert.Contains("If the email exists", result);
            Assert.Equal(0, _emailService.SendCount);
            Assert.Empty(await _context.PasswordResetTokens.ToListAsync());
        }

        // ========================
        // Password Reset Tests
        // ========================

        [Fact]
        public async Task ResetPasswordAsync_WithValidToken_ShouldUpdatePasswordAndRevokeSessionsAndMarkTokenUsed()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");

            // Create an active session
            await _authService.LoginAsync("test@example.com", "password123");

            // Request a password reset (sends email with raw token)
            await _authService.RequestPasswordResetAsync("test@example.com");
            var rawToken = _emailService.LastToken!;

            // Act — reset the password
            await _authService.ResetPasswordAsync(rawToken, "newpassword456");

            // Assert — password was changed (can login with new, cannot with old)
            var loginWithNew = await _authService.LoginAsync("test@example.com", "newpassword456");
            Assert.NotNull(loginWithNew);

            var loginWithOld = await _authService.LoginAsync("test@example.com", "password123");
            Assert.Null(loginWithOld);

            // Assert — token is marked as used
            var savedToken = await _context.PasswordResetTokens.FirstAsync();
            Assert.True(savedToken.IsUsed);
            Assert.NotNull(savedToken.UsedAt);

            // Assert — all old refresh tokens are revoked
            var oldTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == user.Id && rt.CreatedAt < savedToken.UsedAt)
                .ToListAsync();
            Assert.All(oldTokens, t => Assert.True(t.IsRevoked));
        }

        [Fact]
        public async Task ResetPasswordAsync_WithInvalidToken_ShouldThrow()
        {
            // Act & Assert
            var ex = await Assert.ThrowsAsync<Exception>(() =>
                _authService.ResetPasswordAsync("totally-invalid-token", "newpassword"));
            Assert.Contains("Invalid password reset token", ex.Message);
        }

        [Fact]
        public async Task ResetPasswordAsync_WithExpiredToken_ShouldThrow()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");
            await _authService.RequestPasswordResetAsync("test@example.com");

            // Expire the token manually
            var savedToken = await _context.PasswordResetTokens.FirstAsync();
            savedToken.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await _context.SaveChangesAsync();

            // Act & Assert
            var ex = await Assert.ThrowsAsync<Exception>(() =>
                _authService.ResetPasswordAsync(_emailService.LastToken!, "newpassword"));
            Assert.Contains("expired", ex.Message);
        }

        [Fact]
        public async Task ResetPasswordAsync_WithAlreadyUsedToken_ShouldThrow()
        {
            // Arrange
            var user = new User { Username = "testuser", Email = "test@example.com" };
            await _authService.RegisterAsync(user, "password123");
            await _authService.RequestPasswordResetAsync("test@example.com");
            var rawToken = _emailService.LastToken!;

            // Use the token once
            await _authService.ResetPasswordAsync(rawToken, "newpassword456");

            // Act & Assert — second use should fail
            var ex = await Assert.ThrowsAsync<Exception>(() =>
                _authService.ResetPasswordAsync(rawToken, "anotherpassword789"));
            Assert.Contains("already been used", ex.Message);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
