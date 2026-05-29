using System;

namespace CloudStorage.Application.Events
{
    public record ChunkUploadedEvent(Guid FileId, int ChunkIndex, string Hash, string StoragePath, DateTime Timestamp);
    public record FileAssembledEvent(Guid FileId, string FileName, long Size, int ChunkCount, int OwnerId, DateTime Timestamp);
    public record FileVersionCreatedEvent(Guid FileId, int Version, Guid? ParentVersionId, DateTime Timestamp);
    public record SyncConflictDetectedEvent(Guid FileId, int UserId, string DeviceId, string ConflictType, DateTime Timestamp);
    public record PermissionGrantedEvent(Guid FileId, int UserId, int GrantedBy, string PermissionType, DateTime Timestamp);
    public record FileDeletedEvent(Guid FileId, int UserId, DateTime Timestamp);
}
