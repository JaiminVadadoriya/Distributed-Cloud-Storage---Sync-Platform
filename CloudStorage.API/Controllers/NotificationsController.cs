using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.API.Controllers
{
    /// <summary>
    /// Manages user notification retrieval and read-status updates.
    /// Inherits from BaseApiController for shared infrastructure.
    /// </summary>
    [Route("api/[controller]")]
    public class NotificationsController : BaseApiController
    {
        private readonly INotificationPersistenceService _notificationService;

        public NotificationsController(INotificationPersistenceService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public Task<IActionResult> GetNotifications([FromQuery] int limit = 50) => ExecuteAsync(async () =>
        {
            var notifications = await _notificationService.GetUserNotificationsAsync(GetUserId(), limit);
            return Ok(ApiResponse<IEnumerable<NotificationDto>>.Ok(notifications, "Notifications retrieved successfully"));
        });

        [HttpPatch("{id}/read")]
        public Task<IActionResult> MarkAsRead(Guid id) => ExecuteAsync(async () =>
        {
            await _notificationService.MarkAsReadAsync(id, GetUserId());
            return Ok(ApiResponse.Ok("Notification marked as read"));
        });

        [HttpPost("read-all")]
        public Task<IActionResult> MarkAllAsRead() => ExecuteAsync(async () =>
        {
            await _notificationService.MarkAllAsReadAsync(GetUserId());
            return Ok(ApiResponse.Ok("All notifications marked as read"));
        });
    }
}
