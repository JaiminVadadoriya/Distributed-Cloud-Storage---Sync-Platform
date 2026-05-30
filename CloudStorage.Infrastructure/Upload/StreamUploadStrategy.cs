using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Upload;

namespace CloudStorage.Infrastructure.Upload
{
    public class StreamUploadStrategy : IUploadStrategy
    {
        private readonly IStorageProviderFactory _providerFactory;

        public StreamUploadStrategy(IStorageProviderFactory providerFactory)
        {
            _providerFactory = providerFactory;
        }

        public string StrategyName => "Stream";

        public virtual async Task<StorageUploadResult> ExecuteAsync(string providerName, string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            var provider = _providerFactory.GetProvider(providerName);
            return await provider.UploadAsync(objectKey, data, options, ct);
        }
    }
}
