using System;
using System.IO;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces
{
    [Obsolete("Use IChunkStorageProvider")]
    public interface IChunkStorageService
    {
        Task<string> SaveChunkAsync(Guid fileId, int chunkIndex, Stream chunkData);
        Task<bool> ChunkExistsAsync(string hash);
        Task<Stream> GetChunkAsync(string storagePath);
        Task DeleteChunkAsync(string storagePath);
        Task<string> GenerateSasUploadUrlAsync(Guid fileId, int chunkIndex, TimeSpan expiry);
    }
}
