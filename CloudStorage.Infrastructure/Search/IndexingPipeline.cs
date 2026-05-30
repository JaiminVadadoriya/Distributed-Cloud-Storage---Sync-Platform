using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using CloudStorage.Application.Interfaces.AI;
using CloudStorage.Application.Interfaces.Search;

namespace CloudStorage.Infrastructure.Search
{
    public class IndexingPipeline : IIndexingPipeline
    {
        private readonly IStorageIntelligenceService _storageIntelligence;

        public IndexingPipeline(IStorageIntelligenceService storageIntelligence)
        {
            _storageIntelligence = storageIntelligence;
        }

        public async Task ProcessDocumentAsync(string key, string tenantId, Stream contentStream)
        {
            if (contentStream == null) throw new ArgumentNullException(nameof(contentStream));

            string extractedText;
            try
            {
                using var reader = new StreamReader(contentStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true);
                var text = await reader.ReadToEndAsync();
                
                // If it looks binary or is empty, simulate OCR/PDF text extraction
                if (string.IsNullOrWhiteSpace(text) || IsBinary(text))
                {
                    extractedText = $"[Simulated OCR/PDF Document Extraction] Key: {key}. Data: Transaction ledger records and high-throughput enterprise logs.";
                }
                else
                {
                    extractedText = text;
                }
            }
            catch
            {
                extractedText = $"[Simulated Document Recovery Extraction] Key: {key}. Raw metadata stream.";
            }

            var indexKey = $"{tenantId}:{key}";
            ElasticSearchService.ExtractedTexts[indexKey] = extractedText;

            // Generate vector embeddings via AI Storage Intelligence
            var embedding = await _storageIntelligence.GenerateEmbeddingsAsync(extractedText);
            if (embedding != null && embedding.Length > 0)
            {
                ElasticSearchService.Embeddings[indexKey] = embedding;
            }
        }

        private bool IsBinary(string text)
        {
            int controlChars = 0;
            int length = Math.Min(text.Length, 100);
            for (int i = 0; i < length; i++)
            {
                if (char.IsControl(text[i]) && text[i] != '\r' && text[i] != '\n' && text[i] != '\t')
                {
                    controlChars++;
                }
            }
            return controlChars > 10;
        }
    }
}
