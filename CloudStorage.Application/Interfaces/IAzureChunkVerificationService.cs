using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using System;

namespace CloudStorage.Application.Interfaces
{
    [Obsolete("Use IChunkVerificationService")]
    public interface IAzureChunkVerificationService
    {
        Task<BlobChunkVerificationResultDto> VerifyAllChunksAsync(Guid fileId, int chunkCount);
    }
}
