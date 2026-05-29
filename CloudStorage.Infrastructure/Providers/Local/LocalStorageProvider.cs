using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Providers.Local
{
    public class LocalStorageProvider : IObjectStorageProvider
    {
        private readonly string _basePath;
        private readonly string _baseUrl;
        private readonly int _expiryMinutes;
        private readonly ILogger<LocalStorageProvider> _logger;

        public string ProviderName => "Local";

        public LocalStorageProvider(IConfiguration configuration, ILogger<LocalStorageProvider> logger)
        {
            _basePath = configuration["StorageProvider:Local:BasePath"] ?? configuration["Storage:ChunkPath"] ?? "/app/storage/chunks";
            _baseUrl = configuration["StorageProvider:Local:BaseUrl"] ?? "http://localhost:5000";
            _expiryMinutes = int.TryParse(configuration["StorageProvider:PresignedUrlExpiryMinutes"], out int expiry) ? expiry : 15;
            _logger = logger;

            if (!Directory.Exists(_basePath))
            {
                Directory.CreateDirectory(_basePath);
            }
        }

        private string GetFullPath(string objectKey)
        {
            if (Path.IsPathRooted(objectKey))
            {
                return objectKey;
            }
            var cleanKey = objectKey.Replace("..", "").Replace("\\", "/").TrimStart('/');
            return Path.Combine(_basePath, cleanKey);
        }

        public async Task<StorageUploadResult> UploadAsync(string objectKey, Stream data, StorageUploadOptions? options = null, CancellationToken ct = default)
        {
            var fullPath = GetFullPath(objectKey);
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            using var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, useAsync: true);
            await data.CopyToAsync(fileStream, ct);

            // For local provider, we save the full path as the StoragePath
            var storagePath = StoragePathResolver.FormatPath(ProviderName, fullPath);
            return new StorageUploadResult(objectKey, storagePath, null);
        }

        public async Task<Stream> DownloadAsync(string objectKey, StorageDownloadOptions? options = null, CancellationToken ct = default)
        {
            var fullPath = GetFullPath(objectKey);
            if (!File.Exists(fullPath))
            {
                throw new FileNotFoundException($"Local file not found for key: {objectKey}");
            }

            if (options?.RangeStart != null || options?.RangeEnd != null)
            {
                // Range request implementation for local files
                var start = options.RangeStart ?? 0;
                var fileInfo = new FileInfo(fullPath);
                var end = options.RangeEnd ?? (fileInfo.Length - 1);
                var length = end - start + 1;

                var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true);
                if (start > 0)
                {
                    stream.Seek(start, SeekOrigin.Begin);
                }

                // Return a bounded stream
                return new BoundedStream(stream, length);
            }

            return new FileStream(
                fullPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 131072,
                FileOptions.SequentialScan | FileOptions.Asynchronous);
        }

        public Task DeleteAsync(string objectKey, CancellationToken ct = default)
        {
            var fullPath = GetFullPath(objectKey);
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }
            return Task.CompletedTask;
        }

        public Task<bool> ExistsAsync(string objectKey, CancellationToken ct = default)
        {
            var fullPath = GetFullPath(objectKey);
            return Task.FromResult(File.Exists(fullPath));
        }

        public Task<StorageObjectMetadata> GetMetadataAsync(string objectKey, CancellationToken ct = default)
        {
            var fullPath = GetFullPath(objectKey);
            if (!File.Exists(fullPath))
            {
                throw new FileNotFoundException($"Local file not found: {objectKey}");
            }

            var fileInfo = new FileInfo(fullPath);
            return Task.FromResult(new StorageObjectMetadata(
                objectKey,
                fileInfo.Length,
                "application/octet-stream", // default for local files
                fileInfo.LastWriteTimeUtc,
                null,
                false
            ));
        }

        public Task<PresignedUrlResult> GeneratePresignedUploadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken ct = default)
        {
            var expiresAt = DateTime.UtcNow.Add(expiry);
            var unixTime = new DateTimeOffset(expiresAt).ToUnixTimeSeconds();
            var url = $"{_baseUrl.TrimEnd('/')}/api/files/local-proxy?key={Uri.EscapeDataString(objectKey)}&expires={unixTime}&mode=upload";
            return Task.FromResult(new PresignedUrlResult(url, expiresAt, objectKey));
        }

        public Task<PresignedUrlResult> GeneratePresignedDownloadUrlAsync(string objectKey, string? downloadFileName = null, TimeSpan? expiry = null, CancellationToken ct = default)
        {
            var duration = expiry ?? TimeSpan.FromMinutes(_expiryMinutes);
            var expiresAt = DateTime.UtcNow.Add(duration);
            var unixTime = new DateTimeOffset(expiresAt).ToUnixTimeSeconds();
            var url = $"{_baseUrl.TrimEnd('/')}/api/files/local-proxy?key={Uri.EscapeDataString(objectKey)}&expires={unixTime}&mode=download";
            if (!string.IsNullOrEmpty(downloadFileName))
            {
                url += $"&filename={Uri.EscapeDataString(downloadFileName)}";
            }
            return Task.FromResult(new PresignedUrlResult(url, expiresAt, objectKey));
        }

        public StorageProviderCapabilities Capabilities => new StorageProviderCapabilities(
            SupportsPresignedUrls: true,
            SupportsServerSideEncryption: false,
            SupportsRangeRequests: true,
            SupportsMultipartUpload: false
        );

        public Task<bool> IsHealthyAsync(CancellationToken ct = default)
        {
            try
            {
                var tempFile = Path.Combine(_basePath, Guid.NewGuid().ToString() + ".tmp");
                File.WriteAllText(tempFile, "temp");
                File.Delete(tempFile);
                return Task.FromResult(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Local storage provider health check failed");
                return Task.FromResult(false);
            }
        }
    }

    // Helper class to return a portion of a stream (for range requests)
    internal class BoundedStream : Stream
    {
        private readonly Stream _baseStream;
        private readonly long _length;
        private long _position;

        public BoundedStream(Stream baseStream, long length)
        {
            _baseStream = baseStream;
            _length = length;
            _position = 0;
        }

        public override bool CanRead => _baseStream.CanRead;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => _length;
        public override long Position
        {
            get => _position;
            set => throw new NotSupportedException();
        }

        public override void Flush() => _baseStream.Flush();

        public override int Read(byte[] buffer, int offset, int count)
        {
            if (_position >= _length)
            {
                return 0;
            }

            var remaining = _length - _position;
            var toRead = (int)Math.Min(count, remaining);
            var read = _baseStream.Read(buffer, offset, toRead);
            _position += read;
            return read;
        }

        public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            if (_position >= _length)
            {
                return 0;
            }

            var remaining = _length - _position;
            var toRead = (int)Math.Min(count, remaining);
            var read = await _baseStream.ReadAsync(buffer, offset, toRead, cancellationToken);
            _position += read;
            return read;
        }

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _baseStream.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
