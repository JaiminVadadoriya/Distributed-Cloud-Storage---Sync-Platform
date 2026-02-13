using System;
using System.IO;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces
{
    public interface IChunkStorageService
    {
        Task<string> SaveChunkAsync(Guid fileId, int chunkIndex, Stream chunkData);
        Task<bool> ChunkExistsAsync(string hash);
        Task<Stream> GetChunkAsync(Guid fileId, int chunkIndex);
        Task DeleteChunkAsync(Guid fileId, int chunkIndex);
    }
}
