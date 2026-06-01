using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Application.Interfaces
{
    public interface INotificationPersistenceService
    {
        Task<NotificationDto> CreateNotificationAsync(int userId, NotificationType type, string title, string message, Guid? relatedEntityId = null);
        Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId, int limit = 50);
        Task MarkAsReadAsync(Guid notificationId, int userId);
        Task MarkAllAsReadAsync(int userId);
    }
}
