using System;
using System.Collections.Generic;

namespace CloudStorage.Application.Interfaces.Upload
{
    public record ChunkPlan(
        int ChunkIndex,
        long Offset,
        long Size
    );

    public record UploadPlan(
        Guid FileId,
        string ObjectKey,
        string ProviderName,
        string StrategyName,
        long FileSizeBytes,
        List<ChunkPlan> Chunks
    );

    public record UploadProgress(
        Guid FileId,
        long BytesUploaded,
        long TotalBytes,
        double PercentComplete
    );
}
