using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Domain.Interfaces
{
    /// <summary>
    /// Repository for Notification entities.
    /// Now properly extends IRepository for standard CRUD,
    /// adding only notification-specific query methods.
    /// </summary>
    public interface INotificationRepository : IRepository<Notification>
    {
        Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId, int limit = 50);
        Task MarkAsReadAsync(Guid notificationId, int userId);
        Task MarkAllAsReadAsync(int userId);
    }
}
