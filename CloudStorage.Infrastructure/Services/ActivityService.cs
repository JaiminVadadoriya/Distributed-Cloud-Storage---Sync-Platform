using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;

namespace CloudStorage.Infrastructure.Services
{
    public class ActivityService : IActivityService
    {
        private readonly IActivityLogRepository _activityRepo;

        public ActivityService(IActivityLogRepository activityRepo)
        {
            _activityRepo = activityRepo;
        }

        public async Task LogActivityAsync(int userId, string action, string entityType, string entityId, string details, string? ipAddress = null)
        {
            var log = new ActivityLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Details = details,
                IpAddress = ipAddress,
                Timestamp = DateTime.UtcNow
            };

            await _activityRepo.AddAsync(log);
        }

        public async Task<IEnumerable<ActivityLog>> GetUserActivityAsync(int userId, int limit = 50)
        {
            return await _activityRepo.GetRecentActivityAsync(userId, limit);
        }
    }
}
