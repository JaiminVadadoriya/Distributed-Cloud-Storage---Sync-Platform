using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using CloudStorage.Infrastructure.Data;
using System;
using System.Threading.Tasks;
using Xunit;
using Npgsql;

namespace CloudStorage.API.Tests.Fixtures
{
    /// <summary>
    /// Provides test database context for integrated test execution.
    /// Supports both SQLite in-memory (default for fast units) and 
    /// PostgreSQL/Docker (for full integration/persistence tests).
    /// </summary>
    public class TestDatabaseFixture : IAsyncLifetime
    {
        private Microsoft.Data.Sqlite.SqliteConnection? _sqliteConnection;
        private ApplicationDbContext? _context;
        private bool _isPostgres = false;

        public ApplicationDbContext Context => _context ?? throw new InvalidOperationException("Database not initialized");

        public async Task InitializeAsync()
        {
            var postgresConnection = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
                ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>()
                .EnableSensitiveDataLogging()
                .LogTo(Console.WriteLine);

            if (!string.IsNullOrEmpty(postgresConnection))
            {
                _isPostgres = true;
                optionsBuilder.UseNpgsql(postgresConnection);
            }
            else
            {
                _sqliteConnection = new Microsoft.Data.Sqlite.SqliteConnection("Data Source=:memory:");
                await _sqliteConnection.OpenAsync();
                optionsBuilder.UseSqlite(_sqliteConnection);
            }

            _context = new ApplicationDbContext(optionsBuilder.Options);

            // Ensure schema is created
            if (_isPostgres)
            {
                // For Postgres, we might want to migrate or ensure deleted then created
                // await _context.Database.EnsureDeletedAsync();
                await _context.Database.EnsureCreatedAsync();
            }
            else
            {
                await _context.Database.EnsureCreatedAsync();
            }
        }

        public async Task DisposeAsync()
        {
            if (_context != null)
            {
                if (_isPostgres)
                {
                    // Optionally delete test database after run
                    // await _context.Database.EnsureDeletedAsync();
                }
                else
                {
                    await _context.Database.EnsureDeletedAsync();
                }
                await _context.DisposeAsync();
            }

            if (_sqliteConnection != null)
            {
                await _sqliteConnection.CloseAsync();
                await _sqliteConnection.DisposeAsync();
            }
        }

        /// <summary>
        /// Clears all data from the database while preserving schema.
        /// Useful for test isolation within a single test class.
        /// </summary>
        public async Task ClearDatabaseAsync()
        {
            using var transaction = await Context.Database.BeginTransactionAsync();
            try
            {
                // Delete in reverse dependency order
                Context.Notifications.RemoveRange(Context.Notifications);
                Context.FilePermissions.RemoveRange(Context.FilePermissions);
                Context.SyncEvents.RemoveRange(Context.SyncEvents);
                Context.ActivityLogs.RemoveRange(Context.ActivityLogs);
                Context.FileChunks.RemoveRange(Context.FileChunks);
                Context.ChunkRegistry.RemoveRange(Context.ChunkRegistry);
                Context.FileMetadata.RemoveRange(Context.FileMetadata);
                Context.FolderPermissions.RemoveRange(Context.FolderPermissions);
                Context.Folders.RemoveRange(Context.Folders);
                Context.PasswordResetTokens.RemoveRange(Context.PasswordResetTokens);
                Context.RefreshTokens.RemoveRange(Context.RefreshTokens);
                Context.Devices.RemoveRange(Context.Devices);
                Context.Users.RemoveRange(Context.Users);

                await Context.SaveChangesAsync();
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
