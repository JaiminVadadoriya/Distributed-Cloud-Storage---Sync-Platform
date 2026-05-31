using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Application.Interfaces.Storage;
using CloudStorage.Application.Interfaces.Upload;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Upload
{
    public class UploadOrchestrator : IUploadOrchestrator
    {
        private readonly ICapabilityNegotiator _negotiator;
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<UploadOrchestrator> _logger;

        public UploadOrchestrator(
            ICapabilityNegotiator negotiator,
            IServiceProvider serviceProvider,
            ILogger<UploadOrchestrator> logger)
        {
            _negotiator = negotiator;
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public async Task<StorageUploadResult> OrchestrateUploadAsync(
            Guid fileId, 
            string objectKey, 
            Stream data, 
            long fileSizeBytes,
            StorageUploadOptions? options = null, 
            IProgress<UploadProgress>? progress = null,
            CancellationToken ct = default)
        {
            var factory = _serviceProvider.GetRequiredService<IStorageProviderFactory>();
            var provider = factory.GetProvider();
            var providerName = provider.ProviderName;

            var strategyType = _negotiator.ResolveUploadStrategy(providerName, fileSizeBytes);
            _logger.LogInformation("Orchestrator resolved strategy {Strategy} for file {FileId} on {Provider}", 
                strategyType, fileId, providerName);

            IUploadStrategy strategy = strategyType switch
            {
                UploadStrategyType.Multipart => _serviceProvider.GetRequiredService<MultipartUploadStrategy>(),
                UploadStrategyType.BlockBlob => _serviceProvider.GetRequiredService<BlockBlobUploadStrategy>(),
                UploadStrategyType.Resumable => _serviceProvider.GetRequiredService<ResumableUploadStrategy>(),
                _ => _serviceProvider.GetRequiredService<StreamUploadStrategy>()
            };

            var trackingStream = new ProgressTrackingStream(data, fileSizeBytes, progress, fileId, ct);
            var result = await strategy.ExecuteAsync(providerName, objectKey, trackingStream, options, ct);

            _logger.LogInformation("Orchestration completed successfully for file {FileId}", fileId);
            return result;
        }
    }

    public class ProgressTrackingStream : Stream
    {
        private readonly Stream _inner;
        private readonly long _totalBytes;
        private readonly IProgress<UploadProgress>? _progress;
        private readonly Guid _fileId;
        private readonly CancellationToken _ct;
        private long _bytesRead;

        public ProgressTrackingStream(Stream inner, long totalBytes, IProgress<UploadProgress>? progress, Guid fileId, CancellationToken ct)
        {
            _inner = inner;
            _totalBytes = totalBytes;
            _progress = progress;
            _fileId = fileId;
            _ct = ct;
        }

        public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            if (_ct.IsCancellationRequested)
                throw new OperationCanceledException(_ct);
            cancellationToken.ThrowIfCancellationRequested();

            var read = await _inner.ReadAsync(buffer, offset, count, cancellationToken);
            if (read > 0)
            {
                _bytesRead += read;
                if (_progress != null && _totalBytes > 0)
                {
                    var pct = (_bytesRead * 100.0) / _totalBytes;
                    _progress.Report(new UploadProgress(_fileId, _bytesRead, _totalBytes, pct));
                }
            }
            return read;
        }

        public override int Read(byte[] buffer, int offset, int count)
        {
            var read = _inner.Read(buffer, offset, count);
            if (read > 0)
            {
                _bytesRead += read;
                if (_progress != null && _totalBytes > 0)
                {
                    var pct = (_bytesRead * 100.0) / _totalBytes;
                    _progress.Report(new UploadProgress(_fileId, _bytesRead, _totalBytes, pct));
                }
            }
            return read;
        }

        public override bool CanRead => _inner.CanRead;
        public override bool CanSeek => _inner.CanSeek;
        public override bool CanWrite => _inner.CanWrite;
        public override long Length => _inner.Length;
        public override long Position { get => _inner.Position; set => _inner.Position = value; }
        public override void Flush() => _inner.Flush();
        public override long Seek(long offset, SeekOrigin origin) => _inner.Seek(offset, origin);
        public override void SetLength(long value) => _inner.SetLength(value);
        public override void Write(byte[] buffer, int offset, int count) => _inner.Write(buffer, offset, count);
    }
}
