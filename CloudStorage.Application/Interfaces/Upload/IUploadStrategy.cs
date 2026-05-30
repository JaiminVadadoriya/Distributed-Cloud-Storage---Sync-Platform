using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Application.Interfaces.Upload
{
    public interface IUploadStrategy
    {
        string StrategyName { get; }
        Task<StorageUploadResult> ExecuteAsync(string providerName, string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default);
    }
}
