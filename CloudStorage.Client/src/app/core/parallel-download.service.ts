import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService, ApiResponse } from './api.service';
import { firstValueFrom } from 'rxjs';

export interface DownloadMetadata {
  fileName: string;
  totalSize: number;
  contentType: string;
  chunks: {
    index: number;
    size: number;
    sasUrl: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class ParallelDownloadService {
  private api = inject(ApiService);

  /**
   * Orchestrates a high-speed, parallel, direct-to-disk download.
   * 
   * - Uses File System Access API to stream data directly to hardware.
   * - Zero heap overhead: browser does not buffer the full file in memory.
   * - Parallelism: Multi-threaded chunk fetching via native fetch.
   * - Works for 50GB+ files without crashing the browser tab.
   */
  async downloadLargeFile(fileId: string): Promise<void> {
    // 1. Fetch Parallel Download Metadata
    const response = await firstValueFrom(
      this.api.get<ApiResponse<DownloadMetadata>>(`/files/${fileId}/download-link`)
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to initiate parallel download');
    }

    const metadata = response.data;

    // 2. Request native file handle for direct streaming
    let fileHandle: any;
    try {
      if (!('showSaveFilePicker' in window)) {
        throw new Error('Native Direct-to-Disk streaming is not supported in this browser. Please use Chrome, Edge, or Opera.');
      }

      fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: metadata.fileName,
        types: [{
          description: 'File Download',
          accept: { [metadata.contentType || 'application/octet-stream']: ['.' + (metadata.fileName.split('.').pop() || 'bin')] },
        }],
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      throw err;
    }

    const writable = await fileHandle.createWritable();

    try {
      console.log(`[CinePhone Pro] Direct-to-Disk Stream Started: ${metadata.fileName} (${(metadata.totalSize / 1e9).toFixed(2)} GB)`);
      
      const CONCURRENCY = 16; // Optimized for high-throughput Blob storage
      const chunks = metadata.chunks;
      let completedBytes = 0;
      let nextLogBytes = 0;
      const LOG_INTERVAL = Math.max(1024 * 1024 * 50, metadata.totalSize / 100); // Log every 50MB or 1%

      // Serialize writes to prevent InvalidStateError on WritableStream
      let writePromise = Promise.resolve();
      const safeWrite = (data: any, position: number) => {
        writePromise = writePromise.then(() => writable.write({ type: 'write', data, position }));
        return writePromise;
      };

      // Helper to download and write a single chunk at its absolute offset
      const downloadAndWriteChunk = async (chunk: typeof chunks[0]) => {
        const res = await fetch(chunk.sasUrl);
        if (!res.ok) throw new Error(`Network failure on chunk ${chunk.index}: ${res.statusText}`);

        // Calculate absolute byte offset for this chunk
        const absoluteOffset = chunks.slice(0, chunk.index).reduce((sum, c) => sum + c.size, 0);
        
        const reader = res.body?.getReader();
        if (!reader) throw new Error(`Streams not supported for chunk ${chunk.index}`);

        let currentOffset = absoluteOffset;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Random access write: serialized to prevent stream corruption
          await safeWrite(value, currentOffset);
          
          currentOffset += value.length;
          completedBytes += value.length;
          
          if (completedBytes > nextLogBytes) {
            const progress = (completedBytes / metadata.totalSize) * 100;
            console.log(`[CinePhone Pro] Download Progress: ${progress.toFixed(1)}%`);
            nextLogBytes += LOG_INTERVAL;
          }
        }
      };

      // Execution Loop: Process chunks using a dynamic worker pool
      const activeDownloads = new Set<Promise<void>>();
      for (const chunk of chunks) {
        if (activeDownloads.size >= CONCURRENCY) {
          await Promise.race(activeDownloads);
        }
        const promise = downloadAndWriteChunk(chunk).finally(() => activeDownloads.delete(promise));
        activeDownloads.add(promise);
      }
      await Promise.all(activeDownloads);
      
      // Ensure all queued writes are flushed to disk
      await writePromise;

      await writable.close();
      console.log(`[CinePhone Pro] Download Success: ${metadata.fileName}`);
      
    } catch (err) {
      console.error('[CinePhone Pro] Parallel Download Failed:', err);
      await writable.abort();
      throw err;
    }
  }
}
