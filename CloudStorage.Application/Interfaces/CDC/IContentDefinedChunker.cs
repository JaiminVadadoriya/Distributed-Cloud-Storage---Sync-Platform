using System.Collections.Generic;
using System.IO;

namespace CloudStorage.Application.Interfaces.CDC
{
    public record ChunkBoundaryOptions(int MinChunkSize, int MaxChunkSize, int AverageChunkSize);

    public interface IContentDefinedChunker
    {
        IAsyncEnumerable<byte[]> SplitStreamAsync(Stream stream, ChunkBoundaryOptions options);
    }
}
