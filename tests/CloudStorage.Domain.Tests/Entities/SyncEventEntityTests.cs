using System;
using CloudStorage.Domain.Entities;
using Xunit;

namespace CloudStorage.Domain.Tests.Entities
{
    public class SyncEventEntityTests
    {
        [Fact]
        public void SyncEvent_ShouldInitializeWithDefaultValues()
        {
            // Arrange & Act
            var evt = new SyncEvent();

            // Assert
            Assert.Equal(Guid.Empty, evt.Id);
            Assert.Equal(Guid.Empty, evt.FileMetadataId);
            Assert.Null(evt.FileMetadata);
            Assert.Equal(Guid.Empty, evt.DeviceId);
            Assert.Null(evt.Device);
            Assert.Equal(SyncEventType.Created, evt.EventType); // Default enum
            Assert.Equal(default, evt.Timestamp);
            Assert.Null(evt.VersionVector);
        }

        [Fact]
        public void SyncEvent_ShouldSetPropertiesCorrectly()
        {
            // Arrange
            var id = Guid.NewGuid();
            var fileId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            var now = DateTime.UtcNow;
            
            // Act
            var evt = new SyncEvent
            {
                Id = id,
                FileMetadataId = fileId,
                DeviceId = deviceId,
                EventType = SyncEventType.Modified,
                Timestamp = now,
                VersionVector = "vector-data"
            };

            // Assert
            Assert.Equal(id, evt.Id);
            Assert.Equal(fileId, evt.FileMetadataId);
            Assert.Equal(deviceId, evt.DeviceId);
            Assert.Equal(SyncEventType.Modified, evt.EventType);
            Assert.Equal(now, evt.Timestamp);
            Assert.Equal("vector-data", evt.VersionVector);
        }

        [Fact]
        public void SyncEvent_ShouldSupportAllEventTypes()
        {
            // Arrange
            var created = new SyncEvent { EventType = SyncEventType.Created };
            var modified = new SyncEvent { EventType = SyncEventType.Modified };
            var deleted = new SyncEvent { EventType = SyncEventType.Deleted };
            var renamed = new SyncEvent { EventType = SyncEventType.Renamed };

            // Assert
            Assert.Equal(SyncEventType.Created, created.EventType);
            Assert.Equal(SyncEventType.Modified, modified.EventType);
            Assert.Equal(SyncEventType.Deleted, deleted.EventType);
            Assert.Equal(SyncEventType.Renamed, renamed.EventType);
        }

        [Fact]
        public void SyncEvent_ShouldAssociateWithDeviceAndFile()
        {
            // Arrange
            var device = new Device { Id = Guid.NewGuid(), DeviceName = "Laptop" };
            var file = new FileMetadata { Id = Guid.NewGuid(), FileName = "notes.txt" };

            // Act
            var evt = new SyncEvent
            {
                DeviceId = device.Id,
                Device = device,
                FileMetadataId = file.Id,
                FileMetadata = file
            };

            // Assert
            Assert.Equal(device.Id, evt.DeviceId);
            Assert.Same(device, evt.Device);
            Assert.Equal(file.Id, evt.FileMetadataId);
            Assert.Same(file, evt.FileMetadata);
        }
    }
}
