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
            var missingChunks = new List<int>();
            var chunkProvider = _providerFactory.GetChunkProvider();

            for (int i = 0; i < chunkCount; i++)
            {
                var objectKey = $"{fileId}/{i}.chunk";
                var exists = await chunkProvider.ChunkExistsAsync(objectKey, ct);

                if (!exists)
                {
                    _logger.LogWarning("Chunk verification failed: Missing chunk {ObjectKey}", objectKey);
                    missingChunks.Add(i);
                }
            }

            return new ChunkVerificationResult(missingChunks.Count == 0, missingChunks.ToArray());
        }
    }
}
