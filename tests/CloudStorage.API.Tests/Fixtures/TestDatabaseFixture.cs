using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using CloudStorage.Infrastructure.Data;
using System;
using System.Threading.Tasks;
using Xunit;

namespace CloudStorage.API.Tests.Fixtures
{
    /// <summary>
    /// Provides test database context using SQLite for isolated test execution
    /// with automatic schema creation and cleanup.
    /// </summary>
    public class TestDatabaseFixture : IAsyncLifetime
    {
        private Microsoft.Data.Sqlite.SqliteConnection? _connection;
        private ApplicationDbContext? _context;

        public ApplicationDbContext Context => _context ?? throw new InvalidOperationException("Database not initialized");

        public async Task InitializeAsync()
        {
            // Create in-memory SQLite connection (shared mode for transaction support)
            _connection = new Microsoft.Data.Sqlite.SqliteConnection("Data Source=:memory:");
            await _connection.OpenAsync();

            // Configure DbContext with SQLite
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(_connection)
                .EnableSensitiveDataLogging()
                .LogTo(Console.WriteLine)
                .Options;

            _context = new ApplicationDbContext(options);

            // Create database schema
            await _context.Database.EnsureCreatedAsync();
        }

        public async Task DisposeAsync()
        {
            if (_context != null)
            {
                await _context.Database.EnsureDeletedAsync();
                await _context.DisposeAsync();
            }

            if (_connection != null)
            {
                await _connection.CloseAsync();
                await _connection.DisposeAsync();
            }
        }

        /// <summary>
        /// Clears all data from the database while preserving schema.
        /// Useful for test isolation within a single test class.
        /// </summary>
        public async Task ClearDatabaseAsync()
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Delete in reverse dependency order
                _context.Notifications.RemoveRange(_context.Notifications);
                _context.FilePermissions.RemoveRange(_context.FilePermissions);
                _context.SyncEvents.RemoveRange(_context.SyncEvents);
                _context.ActivityLogs.RemoveRange(_context.ActivityLogs);
                _context.FileChunks.RemoveRange(_context.FileChunks);
                _context.ChunkRegistry.RemoveRange(_context.ChunkRegistry);
                _context.FileMetadata.RemoveRange(_context.FileMetadata);
                _context.FolderPermissions.RemoveRange(_context.FolderPermissions);
                _context.Folders.RemoveRange(_context.Folders);
                _context.PasswordResetTokens.RemoveRange(_context.PasswordResetTokens);
                _context.RefreshTokens.RemoveRange(_context.RefreshTokens);
                _context.Devices.RemoveRange(_context.Devices);
                _context.Users.RemoveRange(_context.Users);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
