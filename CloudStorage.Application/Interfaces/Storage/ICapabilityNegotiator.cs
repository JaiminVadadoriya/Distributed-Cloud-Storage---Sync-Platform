using System;

namespace CloudStorage.Application.Interfaces.Storage
{
    public enum UploadStrategyType
    {
        Stream,
        Multipart,
        BlockBlob,
        Resumable
    }

    public interface ICapabilityNegotiator
    {
        IStorageCapabilities GetCapabilities(string providerName);
        bool SupportsFeature(string providerName, string featureName);
        UploadStrategyType ResolveUploadStrategy(string providerName, long fileSizeBytes);
    }
}
