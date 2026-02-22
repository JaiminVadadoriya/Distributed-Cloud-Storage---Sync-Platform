using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;

namespace CloudStorage.Application.Interfaces
{
    public interface IDeltaSyncService
    {
        Task<DeltaSyncResponseDto> GetChangesSinceAsync(int userId, DateTime sinceUtc);
    }
}
