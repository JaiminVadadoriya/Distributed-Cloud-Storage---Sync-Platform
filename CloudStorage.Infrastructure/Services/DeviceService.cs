using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.Services
{
    public class DeviceService : IDeviceService
    {
        private readonly ApplicationDbContext _context;

        public DeviceService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<DeviceDto>> GetUserDevicesAsync(int userId)
        {
            var devices = await _context.Devices
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.LastSyncAt ?? d.CreatedAt)
                .ToListAsync();

            return devices.Select(MapToDto);
        }

        public async Task<DeviceDto> RegisterDeviceAsync(RegisterDeviceDto dto, int userId)
        {
            var device = new Device
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                DeviceName = dto.DeviceName,
                DeviceType = dto.DeviceType,
                CreatedAt = DateTime.UtcNow
            };

            _context.Devices.Add(device);
            await _context.SaveChangesAsync();

            return MapToDto(device);
        }

        public async Task UpdateLastSyncAsync(Guid deviceId, int userId)
        {
            var device = await _context.Devices
                .FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId);

            if (device == null)
                throw new Exception("Device not found or access denied");

            device.LastSyncAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task RemoveDeviceAsync(Guid deviceId, int userId)
        {
            var device = await _context.Devices
                .FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId);

            if (device == null)
                throw new Exception("Device not found or access denied");

            _context.Devices.Remove(device);
            await _context.SaveChangesAsync();
        }

        private static DeviceDto MapToDto(Device d) => new DeviceDto
        {
            Id = d.Id,
            DeviceName = d.DeviceName,
            DeviceType = d.DeviceType,
            LastSyncAt = d.LastSyncAt,
            CreatedAt = d.CreatedAt
        };
    }
}
