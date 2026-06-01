using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;

namespace CloudStorage.Application.Interfaces
{
    public interface IDeviceService
    {
        Task<IEnumerable<DeviceDto>> GetUserDevicesAsync(int userId);
        Task<DeviceDto> RegisterDeviceAsync(RegisterDeviceDto dto, int userId);
        Task UpdateLastSyncAsync(Guid deviceId, int userId);
        Task RemoveDeviceAsync(Guid deviceId, int userId);
        Task ForceSyncAsync(Guid deviceId, int userId);
    }
}
