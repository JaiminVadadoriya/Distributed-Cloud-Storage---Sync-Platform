using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.API.Extensions
{
    public static class MigrationExtensions
    {
        public static void ApplyMigrations(this IApplicationBuilder app)
        {
            using IServiceScope scope = app.ApplicationServices.CreateScope();
            using ApplicationDbContext dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var retries = 5;
            var delay = TimeSpan.FromSeconds(10);

            for (int i = 0; i < retries; i++)
            {
                try
                {
                    Console.WriteLine($"Applying migrations (attempt {i + 1}/{retries})...");
                    dbContext.Database.Migrate();
                    Console.WriteLine("Migrations applied successfully.");
                    return;
                }
                catch (Exception ex)
                {
                    if (i == retries - 1)
                    {
                        Console.WriteLine($"Final migration attempt failed: {ex.Message}");
                        throw;
                    }
                    Console.WriteLine($"Migration attempt {i + 1} failed. Retrying in {delay.TotalSeconds}s... Error: {ex.Message}");
                    System.Threading.Thread.Sleep(delay);
                }
            }
        }
    }
}
