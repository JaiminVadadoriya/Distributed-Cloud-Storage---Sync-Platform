using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers.MinIO
{
    public class MinIOChunkStorageProvider : BaseChunkStorageProvider
    {
        public MinIOChunkStorageProvider(IObjectStorageProvider objectProvider) : base(objectProvider)
        {
        }
    }
}
