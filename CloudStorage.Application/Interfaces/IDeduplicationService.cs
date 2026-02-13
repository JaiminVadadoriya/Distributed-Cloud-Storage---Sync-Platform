using System.Threading.Tasks;
using CloudStorage.Domain.Entities;

namespace CloudStorage.Application.Interfaces
{
    public interface IDeduplicationService
    {
        Task<ChunkRegistry> RegisterChunkAsync(string hash, string storagePath, long size);
        Task<bool> IsChunkDuplicateAsync(string hash);
        Task DecrementReferenceAsync(string hash);
    }
}
