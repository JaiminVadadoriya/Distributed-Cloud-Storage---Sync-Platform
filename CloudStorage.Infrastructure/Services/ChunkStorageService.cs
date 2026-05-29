using System;
using System.IO;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using CloudStorage.Infrastructure.Providers.Local;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CloudStorage.Infrastructure.Services
{
    [Obsolete("Use IChunkStorageProvider")]
    public class ChunkStorageService : IChunkStorageService
    {
        private readonly LocalStorageProvider _provider;
        private readonly LocalChunkStorageProvider _chunkProvider;

        public ChunkStorageService(IConfiguration configuration)
        {
            var logger = new LoggerFactory().CreateLogger<LocalStorageProvider>();
            _provider = new LocalStorageProvider(configuration, logger);
            _chunkProvider = new LocalChunkStorageProvider(_provider);
        }

        public async Task<string> SaveChunkAsync(Guid fileId, int chunkIndex, Stream chunkData)
        {
            return await _chunkProvider.SaveChunkAsync(fileId, chunkIndex, chunkData);
        }

        public async Task<bool> ChunkExistsAsync(string hash)
        {
            return await Task.FromResult(false);
        }

        public async Task<Stream> GetChunkAsync(string storagePath)
        {
            return await _chunkProvider.GetChunkAsync(storagePath);
        }

        public async Task DeleteChunkAsync(string storagePath)
        {
            await _chunkProvider.DeleteChunkAsync(storagePath);
        }

        public async Task<string> GenerateSasUploadUrlAsync(Guid fileId, int chunkIndex, TimeSpan expiry)
        {
            throw new NotSupportedException("SAS URLs are not supported for local files. Use GenerateChunkUploadUrlAsync instead.");
        }
    }
}
