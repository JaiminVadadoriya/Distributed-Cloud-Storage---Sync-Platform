using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using CloudStorage.API;
using CloudStorage.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace CloudStorage.API.Tests.Fixtures
{
    /// <summary>
    /// WebApplicationFactory for integration testing the CloudStorage.API
    /// with a test database and mocked external dependencies.
    /// </summary>
    public class CloudStorageWebApplicationFactory : WebApplicationFactory<Program>
    {
        private Microsoft.Data.Sqlite.SqliteConnection? _sqliteConnection;

        private IServiceScope? _scope;
        public ApplicationDbContext DbContext
        {
            get
            {
                _scope ??= Services.CreateScope();
                return _scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            }
        }

        public CloudStorageWebApplicationFactory()
        {
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureServices(services =>
            {
                // Add test DbContext
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.AddScoped(_ => Moq.Mock.Of<CloudStorage.Application.Interfaces.ICacheService>());
                services.AddScoped(_ => Moq.Mock.Of<CloudStorage.Application.Interfaces.IActivityService>());
                services.AddScoped(_ => Moq.Mock.Of<CloudStorage.Application.Interfaces.INotificationService>());
                services.AddScoped(_ => Moq.Mock.Of<CloudStorage.Application.Interfaces.IBlobSasService>());
                services.AddScoped(_ => Moq.Mock.Of<CloudStorage.Application.Interfaces.IChunkStorageService>());

                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    var postgresConnection = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
                        ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

                    if (!string.IsNullOrEmpty(postgresConnection))
                    {
                        options.UseNpgsql(postgresConnection);
                    }
                    else
                    {
                        if (_sqliteConnection == null)
                        {
                            _sqliteConnection = new Microsoft.Data.Sqlite.SqliteConnection("Data Source=:memory:");
                            _sqliteConnection.Open();
                        }
                        options.UseSqlite(_sqliteConnection);
                        // Suppress warning about pending changes for in-memory DB tests
                        options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
                    }
                });

                // Configure Authentication to use a fake handler for integration tests
                // First remove existing authentication to avoid conflicts
                services.RemoveAll<Microsoft.AspNetCore.Authentication.AuthenticationOptions>();

                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "TestScheme";
                    options.DefaultChallengeScheme = "TestScheme";
                })
                .AddScheme<CloudStorage.API.Tests.Helpers.TestAuthHandlerOptions, CloudStorage.API.Tests.Helpers.TestAuthHandler>(
                    "TestScheme", options => { });

                // Build service provider and ensure database is created
                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                db.Database.EnsureCreated();

                // Seed data via new comprehensive seeder
                CloudStorage.Tests.Seeders.SeedData.SeedAsync(db).GetAwaiter().GetResult();
            });
        }

        public new async ValueTask DisposeAsync()
        {
            if (_sqliteConnection != null)
            {
                await _sqliteConnection.CloseAsync();
                await _sqliteConnection.DisposeAsync();
            }
            await base.DisposeAsync();
        }
    }
}
