using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.AI;
using CloudStorage.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Infrastructure.AI
{
    public class StorageIntelligenceService : IStorageIntelligenceService
    {
        private readonly ApplicationDbContext _dbContext;

        public StorageIntelligenceService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public Task<string> ClassifyContentAsync(string key, byte[] content)
        {
            if (string.IsNullOrEmpty(key)) throw new ArgumentException("Key cannot be null or empty", nameof(key));

            var extension = Path.GetExtension(key).ToLowerInvariant();
            var classification = extension switch
            {
                ".pdf" or ".docx" or ".doc" or ".txt" or ".rtf" => "Documents",
                ".png" or ".jpg" or ".jpeg" or ".gif" or ".mp4" or ".avi" or ".mov" => "Media",
                ".json" or ".csv" or ".xml" or ".yaml" or ".yml" or ".log" => "Data/Logs",
                ".cs" or ".js" or ".py" or ".cpp" or ".go" or ".ts" or ".html" or ".css" => "Source Code",
                ".zip" or ".tar" or ".gz" or ".rar" or ".7z" => "Archive/Compressed",
                _ => "Unclassified Binary Data"
            };

            return Task.FromResult(classification);
        }

        public Task<float[]> GenerateEmbeddingsAsync(string text)
        {
            var vector = new float[128];
            if (string.IsNullOrEmpty(text))
            {
                return Task.FromResult(vector);
            }
            
            // Populate vector elements deterministically based on text
            for (int i = 0; i < vector.Length; i++)
            {
                float sum = 0;
                for (int j = i; j < text.Length; j += vector.Length)
                {
                    sum += text[j];
                }
                vector[i] = (float)Math.Sin(sum + i);
            }

            // Normalize vector to unit length
            double magnitude = 0;
            for (int i = 0; i < vector.Length; i++)
            {
                magnitude += vector[i] * vector[i];
            }
            magnitude = Math.Sqrt(magnitude);

            if (magnitude > 0)
            {
                for (int i = 0; i < vector.Length; i++)
                {
                    vector[i] = (float)(vector[i] / magnitude);
                }
            }

            return Task.FromResult(vector);
        }

        public async Task<bool> DetectDuplicateAsync(string key, byte[] hash)
        {
            if (hash == null || hash.Length == 0) return false;

            var hashStr = Convert.ToHexString(hash).ToLowerInvariant();
            return await _dbContext.ObjectMetadata
                .AnyAsync(m => m.RootHash == hashStr && m.Key != key);
        }
    }
}
