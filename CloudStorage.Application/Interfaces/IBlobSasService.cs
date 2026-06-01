using System;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;

namespace CloudStorage.Application.Interfaces
{
    [Obsolete("Use IObjectStorageProvider or IChunkStorageProvider")]
    public interface IBlobSasService
    {
        Task<SasUploadUrlResponseDto> GenerateChunkUploadSasAsync(Guid fileId, int chunkIndex);
        Task<string> GenerateDownloadSasUrlAsync(string blobName, string fileName);
        Task<bool> ChunkBlobExistsAsync(string blobName);
    }
}
