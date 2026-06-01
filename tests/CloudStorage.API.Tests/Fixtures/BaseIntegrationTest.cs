using CloudStorage.Infrastructure.Data;
using Xunit;

namespace CloudStorage.API.Tests.Fixtures
{
    /// <summary>
    /// Base class for all integration tests.
    /// Provides isolated database context and automatic cleanup.
    /// </summary>
    public abstract class BaseIntegrationTest : IAsyncLifetime
    {
        protected readonly TestDatabaseFixture _fixture;
        protected ApplicationDbContext DbContext => _fixture.Context;

        protected BaseIntegrationTest()
        {
            _fixture = new TestDatabaseFixture();
        }

        async Task IAsyncLifetime.InitializeAsync()
        {
            await _fixture.InitializeAsync();
        }

        async Task IAsyncLifetime.DisposeAsync()
        {
            await _fixture.DisposeAsync();
        }

        /// <summary>
        /// Clears the database between test methods (for test classes with multiple tests).
        /// </summary>
        protected async Task ClearDatabaseAsync()
        {
            await _fixture.ClearDatabaseAsync();
        }

        /// <summary>
        /// Saves changes to the database and returns the DbContext.
        /// </summary>
        protected async Task SaveChangesAsync()
        {
            await DbContext.SaveChangesAsync();
        }
    }
}
