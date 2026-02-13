using System;
using System.IO;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace CloudStorage.Infrastructure.Services
{
    public class ChunkStorageService : IChunkStorageService
    {
        private readonly string _storageBasePath;

        public ChunkStorageService(IConfiguration configuration)
        {
            _storageBasePath = configuration["Storage:ChunkPath"] ?? "/app/storage/chunks";
            
            // Ensure base directory exists
            if (!Directory.Exists(_storageBasePath))
            {
                Directory.CreateDirectory(_storageBasePath);
            }
        }

        public async Task<string> SaveChunkAsync(Guid fileId, int chunkIndex, Stream chunkData)
        {
            var fileDirectory = Path.Combine(_storageBasePath, fileId.ToString());
            
            if (!Directory.Exists(fileDirectory))
            {
                Directory.CreateDirectory(fileDirectory);
            }

            var chunkPath = Path.Combine(fileDirectory, $"{chunkIndex}.chunk");
            
            using var fileStream = new FileStream(chunkPath, FileMode.Create, FileAccess.Write);
            await chunkData.CopyToAsync(fileStream);
            
            return chunkPath;
        }

        public Task<bool> ChunkExistsAsync(string hash)
        {
            // This method checks filesystem, but deduplication is handled by DeduplicationService
            // This is a placeholder for future optimization
            return Task.FromResult(false);
        }

        public Task<Stream> GetChunkAsync(Guid fileId, int chunkIndex)
        {
            var chunkPath = Path.Combine(_storageBasePath, fileId.ToString(), $"{chunkIndex}.chunk");
            
            if (!File.Exists(chunkPath))
            {
                throw new FileNotFoundException($"Chunk {chunkIndex} for file {fileId} not found");
            }

            Stream stream = new FileStream(chunkPath, FileMode.Open, FileAccess.Read);
            return Task.FromResult(stream);
        }

        public Task DeleteChunkAsync(Guid fileId, int chunkIndex)
        {
            var chunkPath = Path.Combine(_storageBasePath, fileId.ToString(), $"{chunkIndex}.chunk");
            
            if (File.Exists(chunkPath))
            {
                File.Delete(chunkPath);
            }

            return Task.CompletedTask;
        }
    }
}
