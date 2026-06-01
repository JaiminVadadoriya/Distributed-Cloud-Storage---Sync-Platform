using System;

namespace CloudStorage.Application.Interfaces.Replication
{
    public enum ReplicationStatus
    {
        Pending,
        InProgress,
        Completed,
        Failed
    }

    public enum ReplicationMode
    {
        ActivePassive,
        ActiveActive,
        GeoRedundant
    }

    public record ReplicationJob(
        string JobId,
        Guid FileId,
        string SourceProvider,
        string TargetProvider,
        string ObjectKey,
        ReplicationStatus Status,
        DateTime CreatedAt,
        DateTime? CompletedAt = null,
        string? Error = null,
        int RetryCount = 0
    );
}
