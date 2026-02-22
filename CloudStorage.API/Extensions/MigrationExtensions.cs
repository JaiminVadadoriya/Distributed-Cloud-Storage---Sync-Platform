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

            try
            {
                dbContext.Database.Migrate();
            }
            catch (Exception)
            {
                // In a real production app, you might want to log this or handle it more gracefully
                // For now, rethrowing ensures the app doesn't start with a broken DB state
                throw;
            }
        }
    }
}
