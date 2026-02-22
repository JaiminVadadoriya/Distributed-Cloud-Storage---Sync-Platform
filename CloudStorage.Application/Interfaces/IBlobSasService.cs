using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;

namespace CloudStorage.Application.Interfaces
{
    public interface IBlobSasService
    {
        Task<SasUploadUrlResponseDto> GenerateChunkUploadSasAsync(Guid fileId, int chunkIndex);
        Task<bool> ChunkBlobExistsAsync(string blobName);
    }
}
