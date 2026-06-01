using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Application.Interfaces.Upload
{
    public interface IUploadOrchestrator
    {
        Task<StorageUploadResult> OrchestrateUploadAsync(
            Guid fileId, 
            string objectKey, 
            Stream data, 
            long fileSizeBytes,
            StorageUploadOptions? options = null, 
            IProgress<UploadProgress>? progress = null,
            CancellationToken ct = default);
    }
}
