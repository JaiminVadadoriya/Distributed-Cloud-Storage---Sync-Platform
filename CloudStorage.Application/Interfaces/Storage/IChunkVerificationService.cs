using System;
using System.Threading;
using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.Storage
{
    public interface IChunkVerificationService
    {
        Task<ChunkVerificationResult> VerifyAllChunksAsync(Guid fileId, int chunkCount, CancellationToken ct = default);
    }
}
