using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.Repositories
{
    public class ActivityLogRepository : Repository<ActivityLog>, IActivityLogRepository
    {
        public ActivityLogRepository(ApplicationDbContext context) : base(context) { }

        public async Task<IEnumerable<ActivityLog>> GetRecentActivityAsync(int userId, int limit = 50)
        {
            return await _dbSet
                .Where(al => al.UserId == userId)
                .OrderByDescending(al => al.Timestamp)
                .Take(limit)
                .ToListAsync();
        }
    }
}
