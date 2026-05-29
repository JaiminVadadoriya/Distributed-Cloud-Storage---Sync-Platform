using System;
using System.Collections.Generic;

namespace CloudStorage.Application.Interfaces.Storage
{
    public record StorageUploadResult(string ObjectKey, string StoragePath, string? ETag = null);
    
    public record StorageUploadOptions
    {
        public string? ContentType { get; init; }
        public IDictionary<string, string>? Metadata { get; init; }
        public bool Overwrite { get; init; } = true;
    }

    public record StorageDownloadOptions
    {
        public long? RangeStart { get; init; }
        public long? RangeEnd { get; init; }
    }

    public record StorageObjectMetadata(
        string ObjectKey, 
        long Size, 
        string? ContentType, 
        DateTime? LastModified, 
        IDictionary<string, string>? CustomMetadata = null, 
        bool? IsEncrypted = null
    );

    public record PresignedUrlResult(string Url, DateTime ExpiresAt, string ObjectKey);

    public record ChunkVerificationResult(bool IsValid, int[] MissingChunkIndices);

    public record StorageProviderCapabilities(
        bool SupportsPresignedUrls, 
        bool SupportsServerSideEncryption, 
        bool SupportsRangeRequests, 
        bool SupportsMultipartUpload, 
        long? MaxObjectSize = null
    );
}
