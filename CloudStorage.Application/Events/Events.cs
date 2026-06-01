using System;

namespace CloudStorage.Application.Events
{
    public record ChunkUploadedEvent(Guid FileId, int ChunkIndex, string Hash, string StoragePath, DateTime Timestamp);
    public record FileAssembledEvent(Guid FileId, string FileName, long Size, int ChunkCount, int OwnerId, DateTime Timestamp);
    public record FileVersionCreatedEvent(Guid FileId, int Version, Guid? ParentVersionId, DateTime Timestamp);
    public record SyncConflictDetectedEvent(Guid FileId, int UserId, string DeviceId, string ConflictType, DateTime Timestamp);
    public record PermissionGrantedEvent(Guid FileId, int UserId, int GrantedBy, string PermissionType, DateTime Timestamp);
    public record FileDeletedEvent(Guid FileId, int UserId, DateTime Timestamp);

    public record FileReplicatedEvent(Guid FileId, string SourceProvider, string TargetProvider, DateTime Timestamp);
    public record ReplicationFailedEvent(Guid FileId, string SourceProvider, string TargetProvider, string Error, int RetryCount, DateTime Timestamp);
    public record ReplicationProgressEvent(Guid FileId, string SourceProvider, string TargetProvider, double ProgressPercent, DateTime Timestamp);
    public record StorageTierChangedEvent(Guid FileId, string ObjectKey, string FromTier, string ToTier, string Provider, DateTime Timestamp);
    public record ProviderHealthChangedEvent(string ProviderName, string PreviousState, string NewState, double HealthScore, DateTime Timestamp);
    public record ArchiveRestoreRequestedEvent(Guid FileId, string ObjectKey, string Provider, DateTime Timestamp);
    public record UploadStrategyChangedEvent(Guid FileId, string FromStrategy, string ToStrategy, string Reason, DateTime Timestamp);
}
