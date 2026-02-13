using System;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Repositories
{
    public class UserRepositoryTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly UserRepository _repository;

        public UserRepositoryTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ApplicationDbContext(options);
            _repository = new UserRepository(_context);
        }

        [Fact]
        public async Task GetByUsernameAsync_WithExistingUser_ShouldReturnUser()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetByUsernameAsync("testuser");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("testuser", result.Username);
            Assert.Equal("test@example.com", result.Email);
        }

        [Fact]
        public async Task GetByUsernameAsync_WithNonExistentUser_ShouldReturnNull()
        {
            // Act
            var result = await _repository.GetByUsernameAsync("nonexistent");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task GetByEmailAsync_WithExistingUser_ShouldReturnUser()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetByEmailAsync("test@example.com");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("testuser", result.Username);
            Assert.Equal("test@example.com", result.Email);
        }

        [Fact]
        public async Task GetByEmailAsync_WithNonExistentEmail_ShouldReturnNull()
        {
            // Act
            var result = await _repository.GetByEmailAsync("nonexistent@example.com");

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task GetWithDevicesAsync_ShouldIncludeDevices()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            var device1 = new Device
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                DeviceName = "Device 1",
                DeviceType = "Mobile",
                LastSyncAt = DateTime.UtcNow
            };
            var device2 = new Device
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                DeviceName = "Device 2",
                DeviceType = "Desktop",
                LastSyncAt = DateTime.UtcNow
            };
            await _context.Devices.AddRangeAsync(device1, device2);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetWithDevicesAsync(user.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Devices.Count);
        }

        [Fact]
        public async Task GetWithDevicesAsync_WithNonExistentUser_ShouldReturnNull()
        {
            // Act
            var result = await _repository.GetWithDevicesAsync(999);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task GetWithRefreshTokensAsync_ShouldIncludeRefreshTokens()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            var token1 = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = "token1",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsRevoked = false
            };
            var token2 = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = "token2",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsRevoked = false
            };
            await _context.RefreshTokens.AddRangeAsync(token1, token2);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetWithRefreshTokensAsync(user.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.RefreshTokens.Count);
        }

        [Fact]
        public async Task GetWithRefreshTokensAsync_WithNonExistentUser_ShouldReturnNull()
        {
            // Act
            var result = await _repository.GetWithRefreshTokensAsync(999);

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task AddAsync_ShouldAddUserToDatabase()
        {
            // Arrange
            var user = new User
            {
                Username = "newuser",
                Email = "new@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };

            // Act
            await _repository.AddAsync(user);

            // Assert
            var savedUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "newuser");
            Assert.NotNull(savedUser);
            Assert.Equal("new@example.com", savedUser.Email);
        }

        [Fact]
        public async Task UpdateAsync_ShouldUpdateUserInDatabase()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Act
            user.Email = "updated@example.com";
            await _repository.UpdateAsync(user);

            // Assert
            var updatedUser = await _context.Users.FindAsync(user.Id);
            Assert.NotNull(updatedUser);
            Assert.Equal("updated@example.com", updatedUser.Email);
        }

        [Fact]
        public async Task DeleteAsync_ShouldRemoveUserFromDatabase()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Act
            await _repository.DeleteAsync(user);

            // Assert
            var deletedUser = await _context.Users.FindAsync(user.Id);
            Assert.Null(deletedUser);
        }

        [Fact]
        public async Task GetByIdAsync_WithExistingUser_ShouldReturnUser()
        {
            // Arrange
            var user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetByIdAsync(user.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(user.Id, result.Id);
        }

        [Fact]
        public async Task GetByIdAsync_WithNonExistentUser_ShouldReturnNull()
        {
            // Act
            var result = await _repository.GetByIdAsync(999);

            // Assert
            Assert.Null(result);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
