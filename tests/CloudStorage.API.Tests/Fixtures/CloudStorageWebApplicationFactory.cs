using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using CloudStorage.API;
using CloudStorage.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;

namespace CloudStorage.API.Tests.Fixtures
{
    /// <summary>
    /// WebApplicationFactory for integration testing the CloudStorage.API
    /// with a test database and mocked external dependencies.
    /// </summary>
    public class CloudStorageWebApplicationFactory : WebApplicationFactory<Program>
    {
        private readonly TestDatabaseFixture _dbFixture;

        public ApplicationDbContext DbContext => _dbFixture.Context;

        public CloudStorageWebApplicationFactory()
        {
            _dbFixture = new TestDatabaseFixture();
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                // Remove the production DbContext
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));

                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Add test DbContext with SQLite
                services.AddDbContext<ApplicationDbContext>((sp, options) =>
                {
                    options.UseSqlite("Data Source=:memory:");
                });

                // Build service provider and ensure database is created
                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.EnsureCreated();
            });
        }

        public new async ValueTask DisposeAsync()
        {
            await _dbFixture.DisposeAsync();
            await base.DisposeAsync();
        }
    }
}
