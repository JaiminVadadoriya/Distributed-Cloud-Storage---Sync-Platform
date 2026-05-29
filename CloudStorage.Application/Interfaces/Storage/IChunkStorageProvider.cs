using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Storage
{
    public interface IChunkStorageProvider
    {
        Task<string> SaveChunkAsync(Guid fileId, int chunkIndex, Stream data, CancellationToken ct = default);
        Task<Stream> GetChunkAsync(string storagePath, CancellationToken ct = default);
        Task DeleteChunkAsync(string storagePath, CancellationToken ct = default);
        Task<bool> ChunkExistsAsync(string objectKey, CancellationToken ct = default);
        Task<PresignedUrlResult> GenerateChunkUploadUrlAsync(Guid fileId, int chunkIndex, TimeSpan expiry, CancellationToken ct = default);
        Task<PresignedUrlResult> GenerateChunkDownloadUrlAsync(string storagePath, string? fileName = null, CancellationToken ct = default);
    }
}
