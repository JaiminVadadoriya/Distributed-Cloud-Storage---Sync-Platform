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

        public Task<Stream> GetChunkAsync(string storagePath)
        {
            if (!File.Exists(storagePath))
            {
                throw new FileNotFoundException($"Chunk not found at path: {storagePath}");
            }

            Stream stream = new FileStream(
                storagePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 131072, // 128 KB OS read-ahead buffer
                FileOptions.SequentialScan | FileOptions.Asynchronous);
            return Task.FromResult(stream);
        }

        public Task DeleteChunkAsync(string storagePath)
        {
            if (File.Exists(storagePath))
            {
                File.Delete(storagePath);
            }

            return Task.CompletedTask;
        }

        public Task<string> GenerateSasUploadUrlAsync(Guid fileId, int chunkIndex, TimeSpan expiry)
        {
            throw new NotSupportedException("SAS URLs are only supported with Azure Blob Storage.");
        }
    }
}
