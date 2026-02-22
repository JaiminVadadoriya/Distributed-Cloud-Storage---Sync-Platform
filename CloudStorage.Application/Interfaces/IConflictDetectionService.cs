using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;

namespace CloudStorage.Application.Interfaces
{
    public interface IConflictDetectionService
    {
        Task<ConflictCheckResponseDto> CheckConflictAsync(Guid fileId, string clientVersionVector);
        Task ResolveConflictAsync(Guid fileId, int userId, ConflictResolution resolution, string? clientVersionVector);
    }
}
