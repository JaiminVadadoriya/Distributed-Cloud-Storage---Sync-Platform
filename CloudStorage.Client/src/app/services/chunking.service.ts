import { Injectable } from '@angular/core';

export interface FileChunk {
  index: number;
  size: number;
  hash: string;
  offset: number;
  data: Blob;
}

@Injectable({
  providedIn: 'root'
})
export class ChunkingService {
  private readonly MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_CHUNKS = 10000; // Target max chunks per file

  /**
   * Calculates the optimal chunk size based on file size to handle Petabyte scale.
   */
  getChunkSize(fileSize: number): number {
    // For small files, use 5MB
    if (fileSize < 50 * 1024 * 1024 * 1024) { // < 50GB
      return this.MIN_CHUNK_SIZE;
    }

    // Aim for ~10,000 chunks to keep DB metadata manageable
    // Size / 10,000
    const calculatedSize = Math.ceil(fileSize / this.MAX_CHUNKS);
    
    // Clamp to at least 5MB and at most 1GB for performance balance
    const oneGB = 1024 * 1024 * 1024;
    return Math.max(this.MIN_CHUNK_SIZE, Math.min(calculatedSize, oneGB));
  }

  /**
   * Splits a file into chunks of CHUNK_SIZE (5MB)
   * @param file The file to split
   * @returns Promise resolving to array of FileChunk objects
   */
  async splitFileIntoChunks(file: File): Promise<FileChunk[]> {
    const chunks: FileChunk[] = [];
    const chunkSize = this.getChunkSize(file.size);
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize;
      const end = Math.min(offset + chunkSize, file.size);
      const chunkBlob = file.slice(offset, end);

      // Calculate hash for this chunk
      const hash = await this.calculateChunkHash(chunkBlob);

      chunks.push({
        index: i,
        size: chunkBlob.size,
        hash: hash,
        offset: offset,
        data: chunkBlob
      });
    }

    return chunks;
  }

  /**
   * Calculates SHA-256 hash of a chunk using Web Crypto API
   * @param chunk The chunk blob to hash
   * @returns Promise resolving to hex-encoded hash string
   */
  async calculateChunkHash(chunk: Blob): Promise<string> {
    const arrayBuffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Creates metadata object for a chunk
   * @param chunk The chunk blob
   * @param index Chunk index
   * @returns Chunk metadata object
   */
  createChunkMetadata(blob: Blob, index: number, totalFileSize: number): Partial<FileChunk> {
    const chunkSize = this.getChunkSize(totalFileSize);
    return {
      index: index,
      size: blob.size,
      offset: index * chunkSize
    };
  }

  /**
   * Calculates total number of chunks for a given file size
   * @param fileSize File size in bytes
   * @returns Number of chunks
   */
  calculateTotalChunks(fileSize: number): number {
    return Math.ceil(fileSize / this.getChunkSize(fileSize));
  }
}
