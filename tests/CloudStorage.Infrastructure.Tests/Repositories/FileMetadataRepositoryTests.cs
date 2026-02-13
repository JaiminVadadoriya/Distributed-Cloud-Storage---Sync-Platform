using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Repositories
{
    public class FileMetadataRepositoryTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly FileMetadataRepository _repository;
        private readonly User _testUser;

        public FileMetadataRepositoryTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ApplicationDbContext(options);
            _repository = new FileMetadataRepository(_context);

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
        public async Task GetUserFilesAsync_ShouldReturnOnlyUserFiles()
        {
            // Arrange
            var file1 = CreateTestFile("file1.txt", _testUser.Id);
            var file2 = CreateTestFile("file2.txt", _testUser.Id);
            
            var otherUser = new User
            {
                Username = "otheruser",
                Email = "other@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(otherUser);
            await _context.SaveChangesAsync();
            
            var file3 = CreateTestFile("file3.txt", otherUser.Id);

            await _context.FileMetadata.AddRangeAsync(file1, file2, file3);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetUserFilesAsync(_testUser.Id);

            // Assert
            var files = result.ToList();
            Assert.Equal(2, files.Count);
            Assert.All(files, f => Assert.Equal(_testUser.Id, f.OwnerId));
        }

        [Fact]
        public async Task GetUserFilesAsync_WithIncludeDeleted_ShouldReturnDeletedFiles()
        {
            // Arrange
            var file1 = CreateTestFile("file1.txt", _testUser.Id);
            var file2 = CreateTestFile("file2.txt", _testUser.Id);
            file2.IsDeleted = true;

            await _context.FileMetadata.AddRangeAsync(file1, file2);
            await _context.SaveChangesAsync();

            // Act
            var resultWithDeleted = await _repository.GetUserFilesAsync(_testUser.Id, includeDeleted: true);
            var resultWithoutDeleted = await _repository.GetUserFilesAsync(_testUser.Id, includeDeleted: false);

            // Assert
            Assert.Equal(2, resultWithDeleted.Count());
            Assert.Single(resultWithoutDeleted);
        }

        [Fact]
        public async Task GetUserFilesAsync_ShouldOrderByCreatedAtDescending()
        {
            // Arrange
            var file1 = CreateTestFile("file1.txt", _testUser.Id);
            file1.CreatedAt = DateTime.UtcNow.AddDays(-2);
            
            var file2 = CreateTestFile("file2.txt", _testUser.Id);
            file2.CreatedAt = DateTime.UtcNow.AddDays(-1);
            
            var file3 = CreateTestFile("file3.txt", _testUser.Id);
            file3.CreatedAt = DateTime.UtcNow;

            await _context.FileMetadata.AddRangeAsync(file1, file2, file3);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetUserFilesAsync(_testUser.Id);

            // Assert
            var files = result.ToList();
            Assert.Equal(file3.Id, files[0].Id);
            Assert.Equal(file2.Id, files[1].Id);
            Assert.Equal(file1.Id, files[2].Id);
        }

        [Fact]
        public async Task GetWithChunksAsync_ShouldIncludeChunksInOrder()
        {
            // Arrange
            var file = CreateTestFile("file.txt", _testUser.Id);
            await _context.FileMetadata.AddAsync(file);
            await _context.SaveChangesAsync();

            var chunk1 = new FileChunk
            {
                Id = Guid.NewGuid(),
                FileMetadataId = file.Id,
                ChunkIndex = 0,
                Size = 1024,
                Hash = "hash1",
                StoragePath = "path1"
            };
            var chunk2 = new FileChunk
            {
                Id = Guid.NewGuid(),
                FileMetadataId = file.Id,
                ChunkIndex = 1,
                Size = 1024,
                Hash = "hash2",
                StoragePath = "path2"
            };
            var chunk3 = new FileChunk
            {
                Id = Guid.NewGuid(),
                FileMetadataId = file.Id,
                ChunkIndex = 2,
                Size = 512,
                Hash = "hash3",
                StoragePath = "path3"
            };

            await _context.FileChunks.AddRangeAsync(chunk3, chunk1, chunk2); // Add out of order
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetWithChunksAsync(file.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(3, result.Chunks.Count);
            var orderedChunks = result.Chunks.OrderBy(c => c.ChunkIndex).ToList();
            Assert.Equal(0, orderedChunks[0].ChunkIndex);
            Assert.Equal(1, orderedChunks[1].ChunkIndex);
            Assert.Equal(2, orderedChunks[2].ChunkIndex);
        }

        [Fact]
        public async Task GetWithChunksAsync_WithNonExistentFile_ShouldReturnNull()
        {
            // Act
            var result = await _repository.GetWithChunksAsync(Guid.NewGuid());

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task GetWithPermissionsAsync_ShouldIncludePermissionsAndUsers()
        {
            // Arrange
            var file = CreateTestFile("file.txt", _testUser.Id);
            await _context.FileMetadata.AddAsync(file);
            await _context.SaveChangesAsync();

            var user2 = new User
            {
                Username = "user2",
                Email = "user2@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(user2);
            await _context.SaveChangesAsync();

            var permission = new FilePermission
            {
                Id = Guid.NewGuid(),
                FileMetadataId = file.Id,
                UserId = user2.Id,
                PermissionType = PermissionType.Read,
                GrantedAt = DateTime.UtcNow,
                GrantedBy = _testUser.Id
            };
            await _context.FilePermissions.AddAsync(permission);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetWithPermissionsAsync(file.Id);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result.Permissions);
            Assert.NotNull(result.Permissions.First().User);
            Assert.Equal("user2", result.Permissions.First().User.Username);
        }

        [Fact]
        public async Task GetSharedFilesAsync_ShouldReturnFilesSharedWithUser()
        {
            // Arrange
            var owner = new User
            {
                Username = "owner",
                Email = "owner@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(owner);
            await _context.SaveChangesAsync();

            var sharedFile1 = CreateTestFile("shared1.txt", owner.Id);
            var sharedFile2 = CreateTestFile("shared2.txt", owner.Id);
            var notSharedFile = CreateTestFile("notshared.txt", owner.Id);

            await _context.FileMetadata.AddRangeAsync(sharedFile1, sharedFile2, notSharedFile);
            await _context.SaveChangesAsync();

            var permission1 = new FilePermission
            {
                Id = Guid.NewGuid(),
                FileMetadataId = sharedFile1.Id,
                UserId = _testUser.Id,
                PermissionType = PermissionType.Read,
                GrantedAt = DateTime.UtcNow,
                GrantedBy = owner.Id
            };
            var permission2 = new FilePermission
            {
                Id = Guid.NewGuid(),
                FileMetadataId = sharedFile2.Id,
                UserId = _testUser.Id,
                PermissionType = PermissionType.Write,
                GrantedAt = DateTime.UtcNow,
                GrantedBy = owner.Id
            };

            await _context.FilePermissions.AddRangeAsync(permission1, permission2);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetSharedFilesAsync(_testUser.Id);

            // Assert
            var files = result.ToList();
            Assert.Equal(2, files.Count);
            Assert.All(files, f => Assert.NotEqual(_testUser.Id, f.OwnerId));
        }

        [Fact]
        public async Task GetSharedFilesAsync_ShouldNotReturnDeletedFiles()
        {
            // Arrange
            var owner = new User
            {
                Username = "owner",
                Email = "owner@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(owner);
            await _context.SaveChangesAsync();

            var sharedFile = CreateTestFile("shared.txt", owner.Id);
            sharedFile.IsDeleted = true;

            await _context.FileMetadata.AddAsync(sharedFile);
            await _context.SaveChangesAsync();

            var permission = new FilePermission
            {
                Id = Guid.NewGuid(),
                FileMetadataId = sharedFile.Id,
                UserId = _testUser.Id,
                PermissionType = PermissionType.Read,
                GrantedAt = DateTime.UtcNow,
                GrantedBy = owner.Id
            };
            await _context.FilePermissions.AddAsync(permission);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.GetSharedFilesAsync(_testUser.Id);

            // Assert
            Assert.Empty(result);
        }

        [Fact]
        public async Task HasPermissionAsync_OwnerShouldHavePermission()
        {
            // Arrange
            var file = CreateTestFile("file.txt", _testUser.Id);
            await _context.FileMetadata.AddAsync(file);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.HasPermissionAsync(file.Id, _testUser.Id, PermissionType.Write);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task HasPermissionAsync_WithExplicitReadPermission_ShouldAllowRead()
        {
            // Arrange
            var owner = new User
            {
                Username = "owner",
                Email = "owner@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(owner);
            await _context.SaveChangesAsync();

            var file = CreateTestFile("file.txt", owner.Id);
            await _context.FileMetadata.AddAsync(file);
            await _context.SaveChangesAsync();

            var permission = new FilePermission
            {
                Id = Guid.NewGuid(),
                FileMetadataId = file.Id,
                UserId = _testUser.Id,
                PermissionType = PermissionType.Read,
                GrantedAt = DateTime.UtcNow,
                GrantedBy = owner.Id
            };
            await _context.FilePermissions.AddAsync(permission);
            await _context.SaveChangesAsync();

            // Act
            var hasReadPermission = await _repository.HasPermissionAsync(file.Id, _testUser.Id, PermissionType.Read);
            var hasWritePermission = await _repository.HasPermissionAsync(file.Id, _testUser.Id, PermissionType.Write);

            // Assert
            Assert.True(hasReadPermission);
            Assert.False(hasWritePermission);
        }

        [Fact]
        public async Task HasPermissionAsync_WithExplicitWritePermission_ShouldAllowBoth()
        {
            // Arrange
            var owner = new User
            {
                Username = "owner",
                Email = "owner@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(owner);
            await _context.SaveChangesAsync();

            var file = CreateTestFile("file.txt", owner.Id);
            await _context.FileMetadata.AddAsync(file);
            await _context.SaveChangesAsync();

            var permission = new FilePermission
            {
                Id = Guid.NewGuid(),
                FileMetadataId = file.Id,
                UserId = _testUser.Id,
                PermissionType = PermissionType.Write,
                GrantedAt = DateTime.UtcNow,
                GrantedBy = owner.Id
            };
            await _context.FilePermissions.AddAsync(permission);
            await _context.SaveChangesAsync();

            // Act
            var hasReadPermission = await _repository.HasPermissionAsync(file.Id, _testUser.Id, PermissionType.Read);
            var hasWritePermission = await _repository.HasPermissionAsync(file.Id, _testUser.Id, PermissionType.Write);

            // Assert
            Assert.True(hasReadPermission);
            Assert.True(hasWritePermission);
        }

        [Fact]
        public async Task HasPermissionAsync_WithNoPermission_ShouldReturnFalse()
        {
            // Arrange
            var owner = new User
            {
                Username = "owner",
                Email = "owner@example.com",
                PasswordHash = "hashedpassword",
                CreatedAt = DateTime.UtcNow
            };
            await _context.Users.AddAsync(owner);
            await _context.SaveChangesAsync();

            var file = CreateTestFile("file.txt", owner.Id);
            await _context.FileMetadata.AddAsync(file);
            await _context.SaveChangesAsync();

            // Act
            var result = await _repository.HasPermissionAsync(file.Id, _testUser.Id, PermissionType.Read);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task HasPermissionAsync_WithNonExistentFile_ShouldReturnFalse()
        {
            // Act
            var result = await _repository.HasPermissionAsync(Guid.NewGuid(), _testUser.Id, PermissionType.Read);

            // Assert
            Assert.False(result);
        }

        private FileMetadata CreateTestFile(string fileName, int ownerId)
        {
            return new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = fileName,
                ContentType = "text/plain",
                Size = 1024,
                Version = 1,
                ChunkCount = 1,
                Hash = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow,
                LastModifiedAt = DateTime.UtcNow,
                OwnerId = ownerId,
                IsDeleted = false,
                StoragePath = $"/storage/{fileName}"
            };
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
