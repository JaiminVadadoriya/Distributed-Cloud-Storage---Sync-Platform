using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.CDC
{
    public record DeduplicationMetrics(long OriginalSize, long DeduplicatedSize, double Ratio, int ChunkCount);

    public interface IDeduplicationOptimizer
    {
        Task<DeduplicationMetrics> AnalyzeSavingsAsync(string fileId, byte[] data);
    }
}
