using System.IO;
using System.Security.Cryptography;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.CDC;

namespace CloudStorage.Infrastructure.CDC
{
    public class DeduplicationOptimizer : IDeduplicationOptimizer
    {
        private readonly IContentDefinedChunker _chunker;

        public DeduplicationOptimizer(IContentDefinedChunker chunker)
        {
            _chunker = chunker;
        }

        public async Task<DeduplicationMetrics> AnalyzeSavingsAsync(string fileId, byte[] data)
        {
            using var stream = new MemoryStream(data);
            var options = new ChunkBoundaryOptions(1024, 8192, 4096);

            int cdcChunksCount = 0;
            var uniqueChunks = new System.Collections.Generic.HashSet<string>();

            await foreach (var chunk in _chunker.SplitStreamAsync(stream, options))
            {
                cdcChunksCount++;
                using var sha = SHA256.Create();
                var hash = System.Convert.ToHexString(sha.ComputeHash(chunk));
                uniqueChunks.Add(hash);
            }

            double uniqueRatio = cdcChunksCount > 0 ? (double)uniqueChunks.Count / cdcChunksCount : 1.0;
            long dedupedSize = (long)(data.Length * uniqueRatio);

            double ratio = data.Length > 0 ? (double)dedupedSize / data.Length : 1.0;

            return new DeduplicationMetrics(data.Length, dedupedSize, ratio, cdcChunksCount);
        }
    }
}
