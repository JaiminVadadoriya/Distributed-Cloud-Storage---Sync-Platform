import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChunkingService, FileChunk } from './chunking.service';
import { UploadService } from './upload.service';
import { UploadProgress } from '../components/upload-progress/upload-progress.component';

export interface UploadTask {
  id: string;
  file: File;
  sessionId?: string;
  chunks: FileChunk[];
  progress: UploadProgress;
  startTime?: number;
  pausedAt?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UploadManagerService {
  private chunkingService = inject(ChunkingService);
  private uploadService = inject(UploadService);

  private uploadTasks = new Map<string, UploadTask>();
  private uploadQueue$ = new BehaviorSubject<UploadTask[]>([]);
  private maxConcurrentUploads = 3;
  private activeUploads = 0;

  /**
   * Gets observable of all upload tasks
   */
  getUploadQueue(): Observable<UploadTask[]> {
    return this.uploadQueue$.asObservable();
  }

  /**
   * Adds a file to the upload queue
   * @param file File to upload
   * @returns Upload task ID
   */
  async addToQueue(file: File): Promise<string> {
    const taskId = this.generateTaskId();
    
    // Split file into chunks
    const chunks = await this.chunkingService.splitFileIntoChunks(file);

    const task: UploadTask = {
      id: taskId,
      file: file,
      chunks: chunks,
      progress: {
        fileName: file.name,
        fileSize: file.size,
        uploadedChunks: 0,
        totalChunks: chunks.length,
        uploadSpeed: 0,
        status: 'pending'
      }
    };

    this.uploadTasks.set(taskId, task);
    this.updateQueue();
    this.processQueue();

    return taskId;
  }

  /**
   * Starts uploading a task
   */
  private async startUpload(taskId: string): Promise<void> {
    const task = this.uploadTasks.get(taskId);
    if (!task) return;

    try {
      this.activeUploads++;
      task.progress.status = 'uploading';
      task.startTime = Date.now();
      this.updateQueue();

      // Initiate upload session
      const session = await this.uploadService.initiateUpload(
        task.file.name,
        task.file.size,
        task.chunks.length,
        task.file.type
      ).toPromise();

      if (!session) {
        throw new Error('Failed to initiate upload session');
      }

      task.sessionId = session.sessionId;

      // Upload chunks with progress tracking
      await this.uploadChunksWithProgress(task);

      // Complete upload
      await this.uploadService.completeUpload(session.sessionId).toPromise();

      task.progress.status = 'complete';
      task.progress.uploadedChunks = task.chunks.length;
      this.updateQueue();

    } catch (error) {
      task.progress.status = 'error';
      task.progress.error = error instanceof Error ? error.message : 'Upload failed';
      this.updateQueue();
    } finally {
      this.activeUploads--;
      this.processQueue();
    }
  }

  /**
   * Uploads chunks with progress tracking
   */
  private async uploadChunksWithProgress(task: UploadTask): Promise<void> {
    if (!task.sessionId) return;

    const startTime = Date.now();
    let lastUpdateTime = startTime;
    let lastUploadedBytes = 0;

    const progressCallback = (uploaded: number) => {
      task.progress.uploadedChunks = uploaded;
      
      // Calculate upload speed
      const now = Date.now();
      const timeDiff = (now - lastUpdateTime) / 1000; // seconds
      
      if (timeDiff > 0) {
        const uploadedBytes = uploaded * this.chunkingService.getChunkSize(task.file.size);
        const bytesDiff = uploadedBytes - lastUploadedBytes;
        task.progress.uploadSpeed = Math.round(bytesDiff / timeDiff);
        
        lastUpdateTime = now;
        lastUploadedBytes = uploadedBytes;
      }

      this.updateQueue();
    };

    await this.uploadService.uploadChunksWithConcurrency(
      task.sessionId,
      task.chunks,
      this.maxConcurrentUploads,
      progressCallback
    );
  }

  /**
   * Pauses an upload
   */
  pauseUpload(taskId: string): void {
    const task = this.uploadTasks.get(taskId);
    if (task && task.progress.status === 'uploading') {
      task.progress.status = 'paused';
      task.pausedAt = Date.now();
      this.updateQueue();
      // TODO: Implement actual pause logic (abort ongoing requests)
    }
  }

  /**
   * Resumes a paused upload
   */
  async resumeUpload(taskId: string): Promise<void> {
    const task = this.uploadTasks.get(taskId);
    if (task && task.progress.status === 'paused' && task.sessionId) {
      // Get upload status from server
      const status = await this.uploadService.resumeUpload(task.sessionId).toPromise();
      
      if (status) {
        // Filter out already uploaded chunks
        const uploadedIndices = new Set(status.uploadedChunks);
        task.chunks = task.chunks.filter(chunk => !uploadedIndices.has(chunk.index));
        task.progress.uploadedChunks = status.uploadedChunks.length;
      }

      task.progress.status = 'pending';
      this.updateQueue();
      this.processQueue();
    }
  }

  /**
   * Cancels an upload
   */
  cancelUpload(taskId: string): void {
    const task = this.uploadTasks.get(taskId);
    if (task) {
      task.progress.status = 'error';
      task.progress.error = 'Upload cancelled by user';
      this.uploadTasks.delete(taskId);
      this.updateQueue();
      // TODO: Implement cleanup (delete chunks from server)
    }
  }

  /**
   * Processes the upload queue
   */
  private processQueue(): void {
    if (this.activeUploads >= this.maxConcurrentUploads) {
      return;
    }

    // Find next pending task
    for (const [taskId, task] of this.uploadTasks.entries()) {
      if (task.progress.status === 'pending' && this.activeUploads < this.maxConcurrentUploads) {
        this.startUpload(taskId);
      }
    }
  }

  /**
   * Updates the queue observable
   */
  private updateQueue(): void {
    const tasks = Array.from(this.uploadTasks.values());
    this.uploadQueue$.next(tasks);
  }

  /**
   * Generates a unique task ID
   */
  private generateTaskId(): string {
    return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets a specific upload task
   */
  getTask(taskId: string): UploadTask | undefined {
    return this.uploadTasks.get(taskId);
  }

  /**
   * Removes completed/failed tasks
   */
  clearCompletedTasks(): void {
    for (const [taskId, task] of this.uploadTasks.entries()) {
      if (task.progress.status === 'complete' || task.progress.status === 'error') {
        this.uploadTasks.delete(taskId);
      }
    }
    this.updateQueue();
  }
}
