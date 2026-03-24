import { Injectable, inject, signal, computed } from '@angular/core';
import { ChunkingService } from './chunking.service';
import { UploadService } from './upload.service';
import { FileChunk } from '../models/upload.model';
import { BaseService } from '../models/base-service';
import { lastValueFrom } from 'rxjs';

export interface UploadTask {
  id: string;
  fileName: string;
  fileSize: number;
  file: File;
  sessionId?: string;
  chunks: FileChunk[];
  status: 'pending' | 'uploading' | 'paused' | 'complete' | 'error';
  uploadedChunks: number;
  totalChunks: number;
  uploadSpeed: number;
  error?: string;
}

/**
 * UploadManagerService orchestrates the high-level queuing and 
 * parallel transmission of file data.
 */
@Injectable({
  providedIn: 'root'
})
export class UploadManagerService extends BaseService {
  private chunker = inject(ChunkingService);
  private uploader = inject(UploadService);

  private readonly _tasks = signal<Map<string, UploadTask>>(new Map());
  private readonly _activeCount = signal<number>(0);
  private readonly MAX_CONCURRENT = 3;

  public readonly queue = computed(() => Array.from(this._tasks().values()));
  
  public readonly globalSpeed = computed(() => 
    this.queue().reduce((acc, t) => acc + (t.status === 'uploading' ? t.uploadSpeed : 0), 0)
  );

  /**
   * Provisions a new transmission task in the local queue.
   */
  public async addToQueue(file: File): Promise<string> {
    const id = `TX_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
    const chunks = await this.chunker.splitFileIntoChunks(file);

    const task: UploadTask = {
      id,
      fileName: file.name,
      fileSize: file.size,
      file,
      chunks,
      status: 'pending',
      uploadedChunks: 0,
      totalChunks: chunks.length,
      uploadSpeed: 0
    };

    this.updateTask(task);
    this.processNext();
    return id;
  }

  private processNext(): void {
    if (this._activeCount() >= this.MAX_CONCURRENT) return;

    const next = this.queue().find(t => t.status === 'pending');
    if (next) this.executeTask(next);
  }

  private async executeTask(task: UploadTask): Promise<void> {
    try {
      this._activeCount.update(c => c + 1);
      this.updateTask({ ...task, status: 'uploading' });

      // Handshake with storage node
      const session = await lastValueFrom(
        this.uploader.initiateUpload(task.file.name, task.file.size, task.totalChunks, task.file.type)
      );

      if (!session) throw new Error('HANDSHAKE_REJECTED');

      const updatedTask = { ...task, sessionId: session.sessionId };
      this.updateTask(updatedTask);

      // Recursive segment transmission
      await this.transmitSegments(updatedTask);

      // Atomic commit
      await lastValueFrom(this.uploader.completeUpload(session.sessionId));
      this.updateTask({ ...updatedTask, status: 'complete', uploadedChunks: task.totalChunks });

    } catch (err: any) {
      this.updateTask({ ...task, status: 'error', error: err.message || 'TRANSMISSION_FAULT' });
    } finally {
      this._activeCount.update(c => c - 1);
      this.processNext();
    }
  }

  private async transmitSegments(task: UploadTask): Promise<void> {
    if (!task.sessionId) return;

    let lastTime = Date.now();
    let lastLoaded = 0;
    const chunkSize = this.chunker.getChunkSize(task.file.size);

    const activeRequests: Promise<any>[] = [];
    const pendingChunks = [...task.chunks];

    while (pendingChunks.length > 0 || activeRequests.length > 0) {
      while (activeRequests.length < this.MAX_CONCURRENT && pendingChunks.length > 0) {
        const chunk = pendingChunks.shift()!;
        const req = lastValueFrom(this.uploader.uploadChunk(task.sessionId, chunk)).then(() => {
          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000;
          
          if (timeDelta > 0.5) {
            const currentTotal = (task.uploadedChunks + 1) * chunkSize;
            task.uploadSpeed = Math.round((currentTotal - lastLoaded) / timeDelta);
            lastTime = now;
            lastLoaded = currentTotal;
          }

          task.uploadedChunks++;
          this.updateTask(task);
        });
        activeRequests.push(req);
        req.finally(() => activeRequests.splice(activeRequests.indexOf(req), 1));
      }
      
      if (activeRequests.length > 0) await Promise.race(activeRequests);
    }
  }

  private updateTask(task: UploadTask): void {
    const map = new Map(this._tasks());
    map.set(task.id, task);
    this._tasks.set(map);
  }

  public clearCompleted(): void {
    const map = new Map(this._tasks());
    for (const [id, t] of map) {
      if (t.status === 'complete' || t.status === 'error') map.delete(id);
    }
    this._tasks.set(map);
  }
}
