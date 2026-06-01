using System;
using System.Threading.Tasks;
using CloudStorage.API.Hubs;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace CloudStorage.API.Services
{
    public class SignalRNotificationService : INotificationService
    {
        private readonly IHubContext<FileStorageHub> _hubContext;

        public SignalRNotificationService(IHubContext<FileStorageHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task NotifyFileUploadedAsync(Guid fileId, string fileName, long size, int ownerId)
        {
            var eventDto = new FileEventDto
            {
                FileId = fileId,
                FileName = fileName,
                Size = size,
                EventType = "FileUploaded",
                Timestamp = DateTime.UtcNow,
                OwnerId = ownerId
            };

            await _hubContext.Clients.Group($"user_{ownerId}").SendAsync("FileEvent", eventDto);
        }

        public async Task NotifyFileDeletedAsync(Guid fileId, int ownerId)
        {
            var eventDto = new FileEventDto
            {
                FileId = fileId,
                EventType = "FileDeleted",
                Timestamp = DateTime.UtcNow,
                OwnerId = ownerId
            };

            await _hubContext.Clients.Group($"user_{ownerId}").SendAsync("FileEvent", eventDto);
        }

        public async Task NotifyAllFilesDeletedAsync(int ownerId)
        {
            var eventDto = new FileEventDto
            {
                EventType = "AllFilesDeleted",
                Timestamp = DateTime.UtcNow,
                OwnerId = ownerId
            };

            await _hubContext.Clients.Group($"user_{ownerId}").SendAsync("FileEvent", eventDto);
        }
    }
}
