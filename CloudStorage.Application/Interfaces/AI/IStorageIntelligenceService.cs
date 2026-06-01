using System.Threading.Tasks;

namespace CloudStorage.Application.Interfaces.AI
{
    public interface IStorageIntelligenceService
    {
        Task<string> ClassifyContentAsync(string key, byte[] content);
        Task<float[]> GenerateEmbeddingsAsync(string text);
        Task<bool> DetectDuplicateAsync(string key, byte[] hash);
    }
}
