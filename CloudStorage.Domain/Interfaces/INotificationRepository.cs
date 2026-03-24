using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Domain.Interfaces
{
    public interface INotificationRepository
    {
        Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId, int limit = 50);
        Task<Notification?> GetByIdAsync(Guid id);
        Task AddAsync(Notification notification);
        Task MarkAsReadAsync(Guid notificationId, int userId);
        Task MarkAllAsReadAsync(int userId);
        Task SaveChangesAsync();
    }
}
