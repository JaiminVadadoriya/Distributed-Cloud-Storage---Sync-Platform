using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Application.Interfaces
{
    public interface IActivityService
    {
        Task LogActivityAsync(int userId, string action, string entityType, string entityId, string details);
        Task<IEnumerable<ActivityLog>> GetUserActivityAsync(int userId, int limit = 50);
    }
}
