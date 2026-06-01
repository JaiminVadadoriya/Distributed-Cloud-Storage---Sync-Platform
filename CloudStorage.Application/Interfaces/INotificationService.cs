using System;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces
{
    public interface INotificationService
    {
        Task NotifyFileUploadedAsync(Guid fileId, string fileName, long size, int ownerId);
        Task NotifyFileDeletedAsync(Guid fileId, int ownerId);
        Task NotifyAllFilesDeletedAsync(int ownerId);
    }
}
