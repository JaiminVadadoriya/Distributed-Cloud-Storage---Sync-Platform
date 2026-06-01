using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CloudStorage.Application.DTOs;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Services
{
    [Obsolete("Use IChunkVerificationService")]
    public class AzureChunkVerificationService : IAzureChunkVerificationService
    {
        private readonly IBlobSasService _sasService;
        private readonly ILogger<AzureChunkVerificationService> _logger;

        public AzureChunkVerificationService(IBlobSasService sasService, ILogger<AzureChunkVerificationService> logger)
        {
            _sasService = sasService;
            _logger = logger;
        }

        public async Task<BlobChunkVerificationResultDto> VerifyAllChunksAsync(Guid fileId, int chunkCount)
        {
            var missingChunks = new List<int>();

            for (int i = 0; i < chunkCount; i++)
            {
                var blobName = $"{fileId}/{i}.chunk";
                var exists = await _sasService.ChunkBlobExistsAsync(blobName);

                if (!exists)
                {
                    _logger.LogWarning("Chunk verification failed: Missing chunk blob {BlobName}", blobName);
                    missingChunks.Add(i);
                }
            }

            return new BlobChunkVerificationResultDto
            {
                IsValid = missingChunks.Count == 0,
                MissingChunkIndices = missingChunks.ToArray()
            };
        }
    }
}
