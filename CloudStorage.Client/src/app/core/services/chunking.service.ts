import { Injectable } from '@angular/core';
import { FileChunk } from '../models/upload.model';

/**
 * ChunkingService handles the logical partitioning of large file entities 
 * into manageable transmission segments (chunks).
 */
@Injectable({
  providedIn: 'root'
})
export class ChunkingService {
  private readonly MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_CHUNKS = 10000; 

  /**
   * Calculates the optimal chunk size based on file size to handle Petabyte scale.
   */
  public getChunkSize(fileSize: number): number {
    if (fileSize < 50 * 1024 * 1024 * 1024) return this.MIN_CHUNK_SIZE;
    const calculatedSize = Math.ceil(fileSize / this.MAX_CHUNKS);
    const oneGB = 1024 * 1024 * 1024;
    return Math.max(this.MIN_CHUNK_SIZE, Math.min(calculatedSize, oneGB));
  }

  /**
   * Splits a file into chunks with cryptographic verification hashes.
   */
  public async splitFileIntoChunks(file: File): Promise<FileChunk[]> {
    const chunks: FileChunk[] = [];
    const chunkSize = this.getChunkSize(file.size);
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize;
      const end = Math.min(offset + chunkSize, file.size);
      const data = file.slice(offset, end);
      const hash = await this.calculateHash(data);

      chunks.push({ index: i, data, hash });
    }

    return chunks;
  }

  /**
   * Generates a SHA-256 integrity hash for a data segment.
   */
  private async calculateHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
