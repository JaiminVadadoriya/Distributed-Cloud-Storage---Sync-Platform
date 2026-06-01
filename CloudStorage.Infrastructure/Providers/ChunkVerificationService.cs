using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Storage;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Providers
{
    public class ChunkVerificationService : IChunkVerificationService
    {
        private readonly IStorageProviderFactory _providerFactory;
        private readonly ILogger<ChunkVerificationService> _logger;

        public ChunkVerificationService(IStorageProviderFactory providerFactory, ILogger<ChunkVerificationService> logger)
        {
            _providerFactory = providerFactory;
            _logger = logger;
        }

        public async Task<ChunkVerificationResult> VerifyAllChunksAsync(Guid fileId, int chunkCount, CancellationToken ct = default)
        {
            var missingChunks = new System.Collections.Concurrent.ConcurrentBag<int>();
            var chunkProvider = _providerFactory.GetChunkProvider();
            using var semaphore = new SemaphoreSlim(10);

            var tasks = new List<Task>();
            for (int i = 0; i < chunkCount; i++)
            {
                var index = i;
                tasks.Add(Task.Run(async () =>
                {
                    await semaphore.WaitAsync(ct);
                    try
                    {
                        var objectKey = $"{fileId}/{index}.chunk";
                        var exists = await chunkProvider.ChunkExistsAsync(objectKey, ct);

                        if (!exists)
                        {
                            _logger.LogWarning("Chunk verification failed: Missing chunk {ObjectKey}", objectKey);
                            missingChunks.Add(index);
                        }
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                }, ct));
            }

            await Task.WhenAll(tasks);

            var sortedMissing = missingChunks.OrderBy(x => x).ToArray();
            return new ChunkVerificationResult(sortedMissing.Length == 0, sortedMissing);
        }
    }
}
