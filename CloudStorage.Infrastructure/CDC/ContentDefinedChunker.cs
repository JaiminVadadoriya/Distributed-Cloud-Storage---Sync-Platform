using System;
using System.Collections.Generic;
using System.IO;
using CloudStorage.Application.Interfaces.CDC;

namespace CloudStorage.Infrastructure.CDC
{
    public class ContentDefinedChunker : IContentDefinedChunker
    {
        public async IAsyncEnumerable<byte[]> SplitStreamAsync(Stream stream, ChunkBoundaryOptions options)
        {
            var buffer = new byte[options.MaxChunkSize * 2];
            int bufferOffset = 0;
            int bytesRead;

            int bits = (int)Math.Max(4, Math.Round(Math.Log2(options.AverageChunkSize)));
            uint mask = (1U << bits) - 1;

            while ((bytesRead = await stream.ReadAsync(buffer, bufferOffset, buffer.Length - bufferOffset)) > 0)
            {
                int totalBytes = bufferOffset + bytesRead;
                int cursor = 0;

                while (cursor < totalBytes)
                {
                    int remainingBytes = totalBytes - cursor;

                    if (remainingBytes < options.MinChunkSize)
                    {
                        Buffer.BlockCopy(buffer, cursor, buffer, 0, remainingBytes);
                        bufferOffset = remainingBytes;
                        cursor = totalBytes;
                        break;
                    }

                    int scanStart = cursor + options.MinChunkSize;
                    int scanEnd = Math.Min(cursor + options.MaxChunkSize, totalBytes);

                    int chunkLen = options.MinChunkSize;
                    uint hash = 0;
                    bool boundaryFound = false;

                    for (int i = scanStart; i < scanEnd; i++)
                    {
                        hash = (hash << 1) + FastCdcChunkBoundaryDetector.GearTable[buffer[i]];
                        if ((hash & mask) == 0)
                        {
                            chunkLen = i - cursor + 1;
                            boundaryFound = true;
                            break;
                        }
                    }

                    if (!boundaryFound)
                    {
                        if (scanEnd - cursor >= options.MaxChunkSize)
                        {
                            chunkLen = options.MaxChunkSize;
                        }
                        else
                        {
                            Buffer.BlockCopy(buffer, cursor, buffer, 0, remainingBytes);
                            bufferOffset = remainingBytes;
                            cursor = totalBytes;
                            break;
                        }
                    }

                    var chunk = new byte[chunkLen];
                    Buffer.BlockCopy(buffer, cursor, chunk, 0, chunkLen);
                    yield return chunk;

                    cursor += chunkLen;
                    bufferOffset = 0;
                }
            }

            if (bufferOffset > 0)
            {
                var finalChunk = new byte[bufferOffset];
                Buffer.BlockCopy(buffer, 0, finalChunk, 0, bufferOffset);
                yield return finalChunk;
            }
        }
    }
}
