using CloudStorage.Application.Interfaces.Storage;

namespace CloudStorage.Infrastructure.Providers.Azure
{
    public class AzureChunkStorageProvider : BaseChunkStorageProvider
    {
        public AzureChunkStorageProvider(IObjectStorageProvider objectProvider) : base(objectProvider)
        {
        }
    }
}
