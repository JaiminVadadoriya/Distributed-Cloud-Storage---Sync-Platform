using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Domain.Interfaces;

namespace CloudStorage.Infrastructure.Services
{
    public class NotificationPersistenceService : INotificationPersistenceService
    {
        private readonly INotificationRepository _repository;

        public NotificationPersistenceService(INotificationRepository repository)
        {
            _repository = repository;
        }

        public async Task<NotificationDto> CreateNotificationAsync(
            int userId, NotificationType type, string title, string message, Guid? relatedEntityId = null)
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = type,
                Title = title,
                Message = message,
                IsRead = false,
                RelatedEntityId = relatedEntityId,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddAsync(notification);
            await _repository.SaveChangesAsync();

            return MapToDto(notification);
        }

        public async Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId, int limit = 50)
        {
            var notifications = await _repository.GetUserNotificationsAsync(userId, limit);
            return notifications.Select(MapToDto);
        }

        public async Task MarkAsReadAsync(Guid notificationId, int userId)
        {
            await _repository.MarkAsReadAsync(notificationId, userId);
        }

        public async Task MarkAllAsReadAsync(int userId)
        {
            await _repository.MarkAllAsReadAsync(userId);
        }

        private static NotificationDto MapToDto(Notification n)
        {
            return new NotificationDto
            {
                Id = n.Id,
                Type = n.Type.ToString(),
                Title = n.Title,
                Message = n.Message,
                IsRead = n.IsRead,
                RelatedEntityId = n.RelatedEntityId,
                CreatedAt = n.CreatedAt
            };
        }
    }
}
