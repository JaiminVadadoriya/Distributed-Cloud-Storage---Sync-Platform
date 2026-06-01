using System;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Domain.Entities;
using CloudStorage.Infrastructure.Data;
using CloudStorage.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CloudStorage.Infrastructure.Tests.Services
{
    public class DeviceServiceTests : IDisposable
    {
        private readonly ApplicationDbContext _context;
        private readonly DeviceService _service;

        public DeviceServiceTests()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new ApplicationDbContext(options);
            _service = new DeviceService(_context);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Fact]
        public async Task RegisterDeviceAsync_AddsDeviceToDatabase()
        {
            // Arrange
            var userId = 1;
            var dto = new RegisterDeviceDto
            {
                DeviceName = "My Phone",
                DeviceType = "Android"
            };

            // Act
            var result = await _service.RegisterDeviceAsync(dto, userId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(dto.DeviceName, result.DeviceName);

            var deviceInDb = await _context.Devices.FirstOrDefaultAsync(d => d.Id == result.Id);
            Assert.NotNull(deviceInDb);
            Assert.Equal(userId, deviceInDb.UserId);
        }

        [Fact]
        public async Task UpdateLastSyncAsync_UpdatesTimestamp()
        {
            // Arrange
            var userId = 1;
            var deviceId = Guid.NewGuid();
            _context.Devices.Add(new Device
            {
                Id = deviceId,
                UserId = userId,
                DeviceName = "Test Device",
                DeviceType = "PC",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            });
            await _context.SaveChangesAsync();

            // Act
            await _service.UpdateLastSyncAsync(deviceId, userId);

            // Assert
            var device = await _context.Devices.FindAsync(deviceId);
            Assert.NotNull(device!.LastSyncAt);
            Assert.True(device.LastSyncAt > DateTime.UtcNow.AddMinutes(-1));
        }

        [Fact]
        public async Task RemoveDeviceAsync_DeletesFromDatabase()
        {
            // Arrange
            var userId = 1;
            var deviceId = Guid.NewGuid();
            _context.Devices.Add(new Device
            {
                Id = deviceId,
                UserId = userId,
                DeviceName = "To Delete",
                DeviceType = "Web"
            });
            await _context.SaveChangesAsync();

            // Act
            await _service.RemoveDeviceAsync(deviceId, userId);

            // Assert
            var device = await _context.Devices.FindAsync(deviceId);
            Assert.Null(device);
        }
    }
}
