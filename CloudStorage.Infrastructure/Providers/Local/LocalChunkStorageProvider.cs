using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers.Local
{
    public class LocalChunkStorageProvider : BaseChunkStorageProvider
    {
        public LocalChunkStorageProvider(IObjectStorageProvider objectProvider) : base(objectProvider)
        {
        }
    }
}
