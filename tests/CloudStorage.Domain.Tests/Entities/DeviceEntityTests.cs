using System;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class DeviceEntityTests
    {
        [Fact]
        public void Device_ShouldInitializeWithDefaultValues()
        {
            // Arrange & Act
            var device = new Device();

            // Assert
            Assert.Equal(Guid.Empty, device.Id);
            Assert.Equal(0, device.UserId);
            Assert.Null(device.User); // Initialize as null! ref type
            Assert.Equal(string.Empty, device.DeviceName);
            Assert.Equal(string.Empty, device.DeviceType);
            Assert.Null(device.LastSyncAt);
            Assert.Equal(default, device.CreatedAt);
        }

        [Fact]
        public void Device_ShouldSetPropertiesCorrectly()
        {
            // Arrange
            var id = Guid.NewGuid();
            var userId = 1;
            var now = DateTime.UtcNow;

            // Act
            var device = new Device
            {
                Id = id,
                UserId = userId,
                DeviceName = "Test PC",
                DeviceType = "Windows",
                LastSyncAt = now,
                CreatedAt = now
            };

            // Assert
            Assert.Equal(id, device.Id);
            Assert.Equal(userId, device.UserId);
            Assert.Equal("Test PC", device.DeviceName);
            Assert.Equal("Windows", device.DeviceType);
            Assert.Equal(now, device.LastSyncAt);
            Assert.Equal(now, device.CreatedAt);
        }

        [Fact]
        public void Device_ShouldAssociateWithUser()
        {
            // Arrange
            var user = new User { Id = 1, Username = "testuser" };

            // Act
            var device = new Device
            {
                UserId = user.Id,
                User = user
            };

            // Assert
            Assert.Equal(user.Id, device.UserId);
            Assert.Same(user, device.User);
        }
    }
}
