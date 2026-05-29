using System;
using System.IO;

namespace CloudStorage.Infrastructure.Providers
{
    public static class StoragePathResolver
    {
        public static (string ProviderName, string CleanKey) Resolve(string storagePath, string defaultProvider = "Local")
        {
            if (string.IsNullOrEmpty(storagePath))
            {
                return (defaultProvider, string.Empty);
            }

            // 1. Legacy Azure scheme: azure://{blobName}
            if (storagePath.StartsWith("azure://", StringComparison.OrdinalIgnoreCase))
            {
                return ("Azure", storagePath.Substring(8));
            }

            // 2. Provider-neutral scheme: provider://{providerName}/{key}
            if (storagePath.StartsWith("provider://", StringComparison.OrdinalIgnoreCase))
            {
                var schemeAndBody = storagePath.Substring(11); // After provider://
                var firstSlashIndex = schemeAndBody.IndexOf('/');
                if (firstSlashIndex >= 0)
                {
                    var provider = schemeAndBody.Substring(0, firstSlashIndex);
                    var key = schemeAndBody.Substring(firstSlashIndex + 1);
                    return (provider, key);
                }
                return (schemeAndBody, string.Empty);
            }

            // 3. Absolute/Relative local filesystem paths
            return ("Local", storagePath);
        }

        public static string FormatPath(string providerName, string cleanKey)
        {
            if (string.Equals(providerName, "Local", StringComparison.OrdinalIgnoreCase))
            {
                // Local paths can just be returned as is (cleanKey holds the filesystem path)
                return cleanKey;
            }
            return $"provider://{providerName}/{cleanKey}";
        }

        public static bool IsRemoteStorage(string storagePath)
        {
            var (providerName, _) = Resolve(storagePath);
            return !string.Equals(providerName, "Local", StringComparison.OrdinalIgnoreCase);
        }
    }
}
