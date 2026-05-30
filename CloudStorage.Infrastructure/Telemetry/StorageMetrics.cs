using System.Diagnostics.Metrics;

namespace CloudStorage.Infrastructure.Telemetry
{
    public static class StorageMetrics
    {
        public static readonly Meter Meter = new("CloudStorage.Storage");

        public static readonly Counter<long> UploadCount = Meter.CreateCounter<long>("storage.upload.count", "Number of uploads");
        public static readonly Counter<long> DownloadCount = Meter.CreateCounter<long>("storage.download.count", "Number of downloads");
        public static readonly Counter<long> ReplicationCount = Meter.CreateCounter<long>("storage.replication.count", "Number of replication jobs");
        public static readonly Counter<long> FailoverCount = Meter.CreateCounter<long>("storage.failover.count", "Number of failovers");
        public static readonly Counter<long> TierTransitionCount = Meter.CreateCounter<long>("storage.tier_transition.count", "Number of tier transitions");
        
        public static readonly Histogram<double> UploadDuration = Meter.CreateHistogram<double>("storage.upload.duration", "ms", "Upload duration");
        public static readonly Histogram<double> DownloadDuration = Meter.CreateHistogram<double>("storage.download.duration", "ms", "Download duration");
    }
}
