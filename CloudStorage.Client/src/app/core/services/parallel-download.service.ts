import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { lastValueFrom } from 'rxjs';
import { BaseService } from '../models/base-service';
import { ApiResponse } from '../models/api-response.model';

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

/**
 * ParallelDownloadService manages high-throughput, multi-threaded 
 * file retrieval using direct-to-disk streaming.
 */
@Injectable({
  providedIn: 'root'
})
export class ParallelDownloadService extends BaseService {
  private api = inject(ApiService);

  /**
   * Orchestrates a high-speed, parallel, direct-to-disk download.
   */
  public async downloadLargeFile(fileId: string): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const response = await lastValueFrom(
        this.api.get<ApiResponse<DownloadMetadata>>(`/files/${fileId}/download-link`)
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'FAULT_INIT_PARALLEL_FETCH');
      }

      const metadata = response.data;

      if (!('showSaveFilePicker' in window)) {
        throw new Error('BROWSER_UNSUPPORTED: Native Direct-to-Disk streaming requires an Engine-based browser.');
      }

      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: metadata.fileName,
        types: [{
          description: 'CinePhone Pro Volume Segment',
          accept: { [metadata.contentType || 'application/octet-stream']: ['.' + (metadata.fileName.split('.').pop() || 'bin')] },
        }],
      });

      const writable = await fileHandle.createWritable();

      try {
        const CONCURRENCY = 16;
        const chunks = metadata.chunks;
        let completedBytes = 0;
        let writePromise = Promise.resolve();
        
        const safeWrite = (data: any, position: number) => {
          writePromise = writePromise.then(() => writable.write({ type: 'write', data, position }));
          return writePromise;
        };

        const downloadAndWriteChunk = async (chunk: typeof chunks[0]) => {
          const res = await fetch(chunk.sasUrl);
          if (!res.ok) throw new Error(`NETWORK_FAULT: Segment ${chunk.index} rejected.`);

          const absoluteOffset = chunks.slice(0, chunk.index).reduce((sum, c) => sum + c.size, 0);
          const reader = res.body?.getReader();
          if (!reader) throw new Error(`STREAM_UNSUPPORTED: Segment ${chunk.index}`);

          let currentOffset = absoluteOffset;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            await safeWrite(value, currentOffset);
            currentOffset += value.length;
            completedBytes += value.length;
          }
        };

        const activeDownloads = new Set<Promise<void>>();
        for (const chunk of chunks) {
          if (activeDownloads.size >= CONCURRENCY) {
            await Promise.race(activeDownloads);
          }
          const promise = downloadAndWriteChunk(chunk).finally(() => activeDownloads.delete(promise));
          activeDownloads.add(promise);
        }
        await Promise.all(activeDownloads);
        await writePromise;
        await writable.close();

      } catch (err) {
        await writable.abort();
        throw err;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[ParallelDownload] Execution failure:', err);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }
}
