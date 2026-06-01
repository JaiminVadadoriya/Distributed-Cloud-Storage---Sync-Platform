using System;
using CloudStorage.Application.Events;
using Xunit;

namespace CloudStorage.Application.Tests.Services
{
    public partial class ApplicationModelTests
    {
        [Fact]
        public void Events_ShouldInitializeCorrectly()
        {
            var now = DateTime.UtcNow;
            var fileId = Guid.NewGuid();

            var e1 = new ChunkUploadedEvent(fileId, 1, "hash", "/path", now);
            Assert.Equal(fileId, e1.FileId);
            Assert.Equal(1, e1.ChunkIndex);
            Assert.Equal("hash", e1.Hash);
            Assert.Equal("/path", e1.StoragePath);
            Assert.Equal(now, e1.Timestamp);

            var e2 = new FileAssembledEvent(fileId, "file.txt", 1024, 2, 5, now);
            Assert.Equal(fileId, e2.FileId);
            Assert.Equal("file.txt", e2.FileName);
            Assert.Equal(1024, e2.Size);
            Assert.Equal(2, e2.ChunkCount);
            Assert.Equal(5, e2.OwnerId);
            Assert.Equal(now, e2.Timestamp);

            var parentVerId = Guid.NewGuid();
            var e3 = new FileVersionCreatedEvent(fileId, 2, parentVerId, now);
            Assert.Equal(fileId, e3.FileId);
            Assert.Equal(2, e3.Version);
            Assert.Equal(parentVerId, e3.ParentVersionId);
            Assert.Equal(now, e3.Timestamp);

            var e4 = new SyncConflictDetectedEvent(fileId, 10, "dev1", "Rename", now);
            Assert.Equal(fileId, e4.FileId);
            Assert.Equal(10, e4.UserId);
            Assert.Equal("dev1", e4.DeviceId);
            Assert.Equal("Rename", e4.ConflictType);
            Assert.Equal(now, e4.Timestamp);

            var e5 = new PermissionGrantedEvent(fileId, 12, 1, "Write", now);
            Assert.Equal(fileId, e5.FileId);
            Assert.Equal(12, e5.UserId);
            Assert.Equal(1, e5.GrantedBy);
            Assert.Equal("Write", e5.PermissionType);
            Assert.Equal(now, e5.Timestamp);

            var e6 = new FileDeletedEvent(fileId, 3, now);
            Assert.Equal(fileId, e6.FileId);
            Assert.Equal(3, e6.UserId);
            Assert.Equal(now, e6.Timestamp);

            var e7 = new FileReplicatedEvent(fileId, "aws", "azure", now);
            Assert.Equal(fileId, e7.FileId);
            Assert.Equal("aws", e7.SourceProvider);
            Assert.Equal("azure", e7.TargetProvider);
            Assert.Equal(now, e7.Timestamp);

            var e8 = new ReplicationFailedEvent(fileId, "aws", "azure", "connection lost", 3, now);
            Assert.Equal(fileId, e8.FileId);
            Assert.Equal("aws", e8.SourceProvider);
            Assert.Equal("azure", e8.TargetProvider);
            Assert.Equal("connection lost", e8.Error);
            Assert.Equal(3, e8.RetryCount);
            Assert.Equal(now, e8.Timestamp);

            var e9 = new ReplicationProgressEvent(fileId, "aws", "azure", 75.5, now);
            Assert.Equal(fileId, e9.FileId);
            Assert.Equal("aws", e9.SourceProvider);
            Assert.Equal("azure", e9.TargetProvider);
            Assert.Equal(75.5, e9.ProgressPercent);
            Assert.Equal(now, e9.Timestamp);

            var e10 = new StorageTierChangedEvent(fileId, "key", "Hot", "Cool", "aws", now);
            Assert.Equal(fileId, e10.FileId);
            Assert.Equal("key", e10.ObjectKey);
            Assert.Equal("Hot", e10.FromTier);
            Assert.Equal("Cool", e10.ToTier);
            Assert.Equal("aws", e10.Provider);
            Assert.Equal(now, e10.Timestamp);

            var e11 = new ProviderHealthChangedEvent("aws", "Healthy", "Degraded", 0.75, now);
            Assert.Equal("aws", e11.ProviderName);
            Assert.Equal("Healthy", e11.PreviousState);
            Assert.Equal("Degraded", e11.NewState);
            Assert.Equal(0.75, e11.HealthScore);
            Assert.Equal(now, e11.Timestamp);

            var e12 = new ArchiveRestoreRequestedEvent(fileId, "key", "aws", now);
            Assert.Equal(fileId, e12.FileId);
            Assert.Equal("key", e12.ObjectKey);
            Assert.Equal("aws", e12.Provider);
            Assert.Equal(now, e12.Timestamp);

            var e13 = new UploadStrategyChangedEvent(fileId, "Stream", "Multipart", "large file", now);
            Assert.Equal(fileId, e13.FileId);
            Assert.Equal("Stream", e13.FromStrategy);
            Assert.Equal("Multipart", e13.ToStrategy);
            Assert.Equal("large file", e13.Reason);
            Assert.Equal(now, e13.Timestamp);
        }
    }
}
