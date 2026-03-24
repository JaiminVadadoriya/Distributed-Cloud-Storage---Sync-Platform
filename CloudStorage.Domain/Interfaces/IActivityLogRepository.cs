using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Domain.Interfaces
{
    public interface IActivityLogRepository : IRepository<ActivityLog>
    {
        Task<IEnumerable<ActivityLog>> GetRecentActivityAsync(int userId, int limit = 50);
    }
}
