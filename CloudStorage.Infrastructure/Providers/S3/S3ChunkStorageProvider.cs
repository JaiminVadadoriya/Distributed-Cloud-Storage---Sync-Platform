using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers.S3
{
    public class S3ChunkStorageProvider : BaseChunkStorageProvider
    {
        public S3ChunkStorageProvider(IObjectStorageProvider objectProvider) : base(objectProvider)
        {
        }
    }
}
