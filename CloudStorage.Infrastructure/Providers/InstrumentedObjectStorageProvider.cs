using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Infrastructure.Telemetry;

namespace CloudStorage.Infrastructure.Providers
{
    public class InstrumentedObjectStorageProvider : IObjectStorageProvider
    {
        private readonly IObjectStorageProvider _inner;

        public InstrumentedObjectStorageProvider(IObjectStorageProvider inner)
        {
            _inner = inner;
        }

        public string ProviderName => _inner.ProviderName;
        public StorageProviderCapabilities Capabilities => _inner.Capabilities;
        public IStorageCapabilities DetailedCapabilities => _inner.DetailedCapabilities;

        public async Task<StorageUploadResult> UploadAsync(string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            using var activity = StorageActivitySource.Source.StartActivity("storage.upload");
            activity?.SetTag("storage.provider", ProviderName);
            activity?.SetTag("storage.object_key", objectKey);

            var stopwatch = Stopwatch.StartNew();
            try
            {
                var result = await _inner.UploadAsync(objectKey, data, options, ct);
                stopwatch.Stop();
                StorageMetrics.UploadCount.Add(1, new KeyValuePair<string, object?>("provider", ProviderName));
                StorageMetrics.UploadDuration.Record(stopwatch.ElapsedMilliseconds, new KeyValuePair<string, object?>("provider", ProviderName));
                return result;
            }
            catch (Exception ex)
            {
                activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                activity?.SetTag("error", true);
                activity?.SetTag("error.message", ex.Message);
                throw;
            }
        }

        public async Task<Stream> DownloadAsync(string objectKey, StorageDownloadOptions? options = null, CancellationToken ct = default)
        {
            using var activity = StorageActivitySource.Source.StartActivity("storage.download");
            activity?.SetTag("storage.provider", ProviderName);
            activity?.SetTag("storage.object_key", objectKey);

            var stopwatch = Stopwatch.StartNew();
            try
            {
                var result = await _inner.DownloadAsync(objectKey, options, ct);
                stopwatch.Stop();
                StorageMetrics.DownloadCount.Add(1, new KeyValuePair<string, object?>("provider", ProviderName));
                StorageMetrics.DownloadDuration.Record(stopwatch.ElapsedMilliseconds, new KeyValuePair<string, object?>("provider", ProviderName));
                return result;
            }
            catch (Exception ex)
            {
                activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                activity?.SetTag("error", true);
                activity?.SetTag("error.message", ex.Message);
                throw;
            }
        }

        public async Task DeleteAsync(string objectKey, CancellationToken ct = default)
        {
            using var activity = StorageActivitySource.Source.StartActivity("storage.delete");
            activity?.SetTag("storage.provider", ProviderName);
            activity?.SetTag("storage.object_key", objectKey);

            try
            {
                await _inner.DeleteAsync(objectKey, ct);
            }
            catch (Exception ex)
            {
                activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                activity?.SetTag("error", true);
                activity?.SetTag("error.message", ex.Message);
                throw;
            }
        }

        public Task<bool> ExistsAsync(string objectKey, CancellationToken ct = default) => _inner.ExistsAsync(objectKey, ct);
        
        public Task<StorageObjectMetadata> GetMetadataAsync(string objectKey, CancellationToken ct = default) => _inner.GetMetadataAsync(objectKey, ct);

        public Task<PresignedUrlResult> GeneratePresignedUploadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken ct = default) => 
            _inner.GeneratePresignedUploadUrlAsync(objectKey, expiry, ct);

        public Task<PresignedUrlResult> GeneratePresignedDownloadUrlAsync(string objectKey, string? downloadFileName = null, TimeSpan? expiry = null, CancellationToken ct = default) => 
            _inner.GeneratePresignedDownloadUrlAsync(objectKey, downloadFileName, expiry, ct);

        public Task<bool> IsHealthyAsync(CancellationToken ct = default) => _inner.IsHealthyAsync(ct);
    }
}
