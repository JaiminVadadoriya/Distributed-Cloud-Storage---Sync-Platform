using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.Metadata;
using CloudStorage.Application.Interfaces.Search;

namespace CloudStorage.Infrastructure.Search
{
    public class ElasticSearchService : ISearchService, IMetadataIndexer
    {
        // Thread-safe in-memory index stores
        private static readonly ConcurrentDictionary<string, ObjectMetadata> MetadataIndex = new();
        
        // Extracted full text for files: key is $"{tenantId}:{objectKey}"
        public static ConcurrentDictionary<string, string> ExtractedTexts { get; } = new();

        // Vector embeddings: key is $"{tenantId}:{objectKey}"
        public static ConcurrentDictionary<string, float[]> Embeddings { get; } = new();

        private string GetIndexKey(string key, string tenantId) => $"{tenantId}:{key}";

        public Task IndexAsync(ObjectMetadata metadata)
        {
            if (metadata == null) throw new ArgumentNullException(nameof(metadata));
            var key = GetIndexKey(metadata.Key, metadata.TenantId);
            MetadataIndex[key] = metadata;
            return Task.CompletedTask;
        }

        public Task DeindexAsync(string key, string tenantId)
        {
            var idxKey = GetIndexKey(key, tenantId);
            MetadataIndex.TryRemove(idxKey, out _);
            ExtractedTexts.TryRemove(idxKey, out _);
            Embeddings.TryRemove(idxKey, out _);
            return Task.CompletedTask;
        }

        public Task<List<SearchResultItem>> SearchAsync(string query, string tenantId, int limit = 50)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Task.FromResult(new List<SearchResultItem>());
            }

            var results = new List<SearchResultItem>();
            var lowerQuery = query.ToLowerInvariant();

            foreach (var item in MetadataIndex.Values.Where(m => m.TenantId == tenantId))
            {
                double score = 0;

                // Match Key
                if (item.Key.ToLowerInvariant().Contains(lowerQuery))
                {
                    score += 10.0;
                }

                // Match Tags
                if (item.Tags != null)
                {
                    foreach (var tag in item.Tags)
                    {
                        if (tag.Key.ToLowerInvariant().Contains(lowerQuery) || tag.Value.ToLowerInvariant().Contains(lowerQuery))
                        {
                            score += 5.0;
                        }
                    }
                }

                // Match Extracted Text if available
                var idxKey = GetIndexKey(item.Key, tenantId);
                if (ExtractedTexts.TryGetValue(idxKey, out var text) && text.ToLowerInvariant().Contains(lowerQuery))
                {
                    score += 20.0;
                }

                if (score > 0)
                {
                    results.Add(new SearchResultItem(
                        item.Key,
                        item.TenantId,
                        score,
                        item.Tags ?? new Dictionary<string, string>()
                    ));
                }
            }

            var sorted = results.OrderByDescending(r => r.Score).Take(limit).ToList();
            return Task.FromResult(sorted);
        }

        public Task<List<SearchResultItem>> SemanticSearchAsync(float[] queryVector, string tenantId, int limit = 50)
        {
            if (queryVector == null || queryVector.Length == 0)
            {
                return Task.FromResult(new List<SearchResultItem>());
            }

            var results = new List<SearchResultItem>();

            foreach (var item in MetadataIndex.Values.Where(m => m.TenantId == tenantId))
            {
                var idxKey = GetIndexKey(item.Key, tenantId);
                if (Embeddings.TryGetValue(idxKey, out var docVector))
                {
                    double similarity = CalculateCosineSimilarity(queryVector, docVector);
                    if (similarity > 0.1) // Minimum relevance threshold
                    {
                        results.Add(new SearchResultItem(
                            item.Key,
                            item.TenantId,
                            similarity * 100.0, // scale to a score
                            item.Tags ?? new Dictionary<string, string>()
                        ));
                    }
                }
            }

            var sorted = results.OrderByDescending(r => r.Score).Take(limit).ToList();
            return Task.FromResult(sorted);
        }

        private double CalculateCosineSimilarity(float[] vectorA, float[] vectorB)
        {
            if (vectorA == null || vectorB == null || vectorA.Length != vectorB.Length)
            {
                return 0;
            }

            double dotProduct = 0;
            double magnitudeA = 0;
            double magnitudeB = 0;

            for (int i = 0; i < vectorA.Length; i++)
            {
                dotProduct += vectorA[i] * vectorB[i];
                magnitudeA += vectorA[i] * vectorA[i];
                magnitudeB += vectorB[i] * vectorB[i];
            }

            if (magnitudeA == 0 || magnitudeB == 0)
            {
                return 0;
            }

            return dotProduct / (Math.Sqrt(magnitudeA) * Math.Sqrt(magnitudeB));
        }
    }
}
