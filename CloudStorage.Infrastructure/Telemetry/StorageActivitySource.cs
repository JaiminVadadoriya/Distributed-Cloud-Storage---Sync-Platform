using System.Diagnostics;

namespace CloudStorage.Infrastructure.Telemetry
{
    public static class StorageActivitySource
    {
        public static readonly ActivitySource Source = new("CloudStorage.Storage");
    }
}
