using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class ConflictDetectionServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly ConflictDetectionService _service;
        private readonly User _testUser;

        public ConflictDetectionServiceTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ApplicationDbContext(options);
            _service = new ConflictDetectionService(_context);

            // Seed a test user
            _testUser = new User
            {
                Id = 1,
                Username = "testuser",
                Email = "test@test.com",
                PasswordHash = "hash",
                CreatedAt = DateTime.UtcNow
            };
            _context.Users.Add(_testUser);
            _context.SaveChanges();
        }

        private FileMetadata CreateTestFile(string? versionVector = null)
        {
            var file = new FileMetadata
            {
                Id = Guid.NewGuid(),
                FileName = "test.txt",
                ContentType = "text/plain",
                Size = 1024,
                Version = 1,
                Hash = "abc123",
                CreatedAt = DateTime.UtcNow,
                LastModifiedAt = DateTime.UtcNow,
                OwnerId = _testUser.Id,
                IsDeleted = false,
                StoragePath = "/test/path",
                Status = UploadStatus.Complete,
                VersionVector = versionVector
            };
            _context.FileMetadata.Add(file);
            _context.SaveChanges();
            return file;
        }

        // ──────────────────────────────────────────────
        // Version Vector Comparison Tests (static)
        // ──────────────────────────────────────────────

        [Fact]
        public void AreVersionVectorsConcurrent_EmptyVectors_ShouldReturnFalse()
        {
            var a = new Dictionary<string, int>();
            var b = new Dictionary<string, int>();
            Assert.False(ConflictDetectionService.AreVersionVectorsConcurrent(a, b));
        }

        [Fact]
        public void AreVersionVectorsConcurrent_ADominatesB_ShouldReturnFalse()
        {
            var a = new Dictionary<string, int> { { "d1", 3 }, { "d2", 2 } };
            var b = new Dictionary<string, int> { { "d1", 2 }, { "d2", 1 } };
            Assert.False(ConflictDetectionService.AreVersionVectorsConcurrent(a, b));
        }

        [Fact]
        public void AreVersionVectorsConcurrent_BDominatesA_ShouldReturnFalse()
        {
            var a = new Dictionary<string, int> { { "d1", 1 }, { "d2", 1 } };
            var b = new Dictionary<string, int> { { "d1", 2 }, { "d2", 3 } };
            Assert.False(ConflictDetectionService.AreVersionVectorsConcurrent(a, b));
        }

        [Fact]
        public void AreVersionVectorsConcurrent_ConcurrentVectors_ShouldReturnTrue()
        {
            // d1 is ahead in A, d2 is ahead in B — concurrent!
            var a = new Dictionary<string, int> { { "d1", 3 }, { "d2", 1 } };
            var b = new Dictionary<string, int> { { "d1", 2 }, { "d2", 2 } };
            Assert.True(ConflictDetectionService.AreVersionVectorsConcurrent(a, b));
        }

        [Fact]
        public void AreVersionVectorsConcurrent_DisjointKeys_ShouldReturnTrue()
        {
            var a = new Dictionary<string, int> { { "d1", 1 } };
            var b = new Dictionary<string, int> { { "d2", 1 } };
            Assert.True(ConflictDetectionService.AreVersionVectorsConcurrent(a, b));
        }

        [Fact]
        public void AreVersionVectorsConcurrent_EqualVectors_ShouldReturnFalse()
        {
            var a = new Dictionary<string, int> { { "d1", 2 }, { "d2", 3 } };
            var b = new Dictionary<string, int> { { "d1", 2 }, { "d2", 3 } };
            Assert.False(ConflictDetectionService.AreVersionVectorsConcurrent(a, b));
        }

        // ──────────────────────────────────────────────
        // Merge Tests
        // ──────────────────────────────────────────────

        [Fact]
        public void MergeVersionVectors_ShouldTakeMaxOfEachKey()
        {
            var a = new Dictionary<string, int> { { "d1", 3 }, { "d2", 1 } };
            var b = new Dictionary<string, int> { { "d1", 2 }, { "d2", 5 }, { "d3", 1 } };

            var merged = ConflictDetectionService.MergeVersionVectors(a, b);

            Assert.Equal(3, merged["d1"]);
            Assert.Equal(5, merged["d2"]);
            Assert.Equal(1, merged["d3"]);
        }

        // ──────────────────────────────────────────────
        // CheckConflictAsync Integration Tests
        // ──────────────────────────────────────────────

        [Fact]
        public async Task CheckConflict_NoConcurrency_ShouldReturnNoConflict()
        {
            var serverVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 3 }, { "d2", 2 } });
            var file = CreateTestFile(serverVector);

            // Client has same or later version — no conflict
            var clientVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 3 }, { "d2", 3 } });

            var result = await _service.CheckConflictAsync(file.Id, clientVector);

            Assert.False(result.HasConflict);
            Assert.Equal(file.FileName, result.ServerFileName);
        }

        [Fact]
        public async Task CheckConflict_ConcurrentVectors_ShouldReturnConflict()
        {
            var serverVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 3 }, { "d2", 1 } });
            var file = CreateTestFile(serverVector);

            var clientVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 2 }, { "d2", 2 } });

            var result = await _service.CheckConflictAsync(file.Id, clientVector);

            Assert.True(result.HasConflict);
            Assert.Equal(serverVector, result.ServerVersionVector);
        }

        [Fact]
        public async Task CheckConflict_ClientAhead_ShouldReturnNoConflict()
        {
            var serverVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 1 } });
            var file = CreateTestFile(serverVector);

            var clientVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 5 } });

            var result = await _service.CheckConflictAsync(file.Id, clientVector);

            Assert.False(result.HasConflict);
        }

        [Fact]
        public async Task CheckConflict_FileNotFound_ShouldReturnNoConflict()
        {
            var result = await _service.CheckConflictAsync(Guid.NewGuid(), "{}");
            Assert.False(result.HasConflict);
        }

        // ──────────────────────────────────────────────
        // ResolveConflictAsync Integration Tests
        // ──────────────────────────────────────────────

        [Fact]
        public async Task ResolveConflict_KeepServer_ShouldNotModifyServerData()
        {
            var serverVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 3 } });
            var file = CreateTestFile(serverVector);
            var originalVersion = file.Version;

            await _service.ResolveConflictAsync(
                file.Id, _testUser.Id, ConflictResolution.KeepServer, null);

            var updated = await _context.FileMetadata.FindAsync(file.Id);
            Assert.Equal(originalVersion, updated!.Version);
            Assert.Equal(serverVector, updated.VersionVector);
        }

        [Fact]
        public async Task ResolveConflict_KeepLocal_ShouldMergeVersionVectors()
        {
            var serverVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 3 }, { "d2", 1 } });
            var file = CreateTestFile(serverVector);

            var clientVector = JsonSerializer.Serialize(
                new Dictionary<string, int> { { "d1", 2 }, { "d2", 5 } });

            await _service.ResolveConflictAsync(
                file.Id, _testUser.Id, ConflictResolution.KeepLocal, clientVector);

            var updated = await _context.FileMetadata.FindAsync(file.Id);
            var mergedVector = JsonSerializer.Deserialize<Dictionary<string, int>>(updated!.VersionVector!);

            Assert.Equal(3, mergedVector!["d1"]); // Max(3, 2)
            Assert.Equal(5, mergedVector["d2"]);  // Max(1, 5)
            Assert.Equal(2, updated.Version);     // Incremented
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}
