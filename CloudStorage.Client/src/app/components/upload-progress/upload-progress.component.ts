import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UploadProgress {
  fileName: string;
  fileSize: number;
  uploadedChunks: number;
  totalChunks: number;
  uploadSpeed: number; // bytes per second
  status: 'pending' | 'uploading' | 'paused' | 'complete' | 'error';
  error?: string;
}

@Component({
  selector: 'app-upload-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 p-4 transition-all"
         [ngClass]="{'border-red-200 bg-red-50 dark:bg-red-900/10': progress.status === 'error'}">
      
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3 overflow-hidden">
           <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-text-muted flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
           </div>
           <div class="min-w-0">
             <h4 class="font-medium truncate" [title]="progress.fileName">{{ progress.fileName }}</h4>
             <div class="text-xs text-text-muted flex items-center gap-2">
                <span>{{ uploadedSizeFormatted }} / {{ totalSizeFormatted }}</span>
             </div>
           </div>
        </div>

        <div class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
             [ngClass]="{
               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300': progress.status === 'uploading',
               'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300': progress.status === 'paused' || progress.status === 'pending',
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300': progress.status === 'complete',
               'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300': progress.status === 'error'
             }">
          {{ progress.status }}
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-4 relative">
        <div class="h-full bg-primary transition-all duration-300 ease-out" [style.width.%]="progressPercentage"
             [ngClass]="{
               'bg-yellow-500': progress.status === 'paused',
               'bg-green-500': progress.status === 'complete',
               'bg-red-500': progress.status === 'error'
             }"></div>
      </div>

      <!-- Details & Controls -->
      <div class="flex items-center justify-between">
         <div class="flex items-center gap-4 text-xs text-text-muted">
            @if (progress.status === 'uploading') {
              <div class="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4"/><path d="m5 13 7 7 7-7"/></svg>
                {{ uploadSpeedFormatted }}
              </div>
              <div class="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ estimatedTimeRemaining }}
              </div>
            }
            @if (progress.status === 'error' && progress.error) {
              <div class="text-red-500 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ progress.error }}
              </div>
            }
         </div>

         <div class="flex items-center gap-2">
            @if (progress.status === 'uploading') {
              <button (click)="onPause()" 
                      class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-text-muted transition-colors" title="Pause">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </button>
            }
            @if (progress.status === 'paused') {
              <button (click)="onResume()" 
                      class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-text-muted transition-colors" title="Resume">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            }
            @if (progress.status !== 'complete') {
              <button (click)="onCancel()" 
                      class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors" title="Cancel">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            }
         </div>
      </div>
    </div>
  `
})
export class UploadProgressComponent {
  @Input() progress!: UploadProgress;
  @Output() uploadPaused = new EventEmitter<void>();
  @Output() uploadResumed = new EventEmitter<void>();
  @Output() uploadCancelled = new EventEmitter<void>();

  get progressPercentage(): number {
    if (this.progress.totalChunks === 0) return 0;
    return Math.round((this.progress.uploadedChunks / this.progress.totalChunks) * 100);
  }

  get estimatedTimeRemaining(): string {
    if (this.progress.uploadSpeed === 0 || this.progress.status !== 'uploading') {
      return '--:--';
    }

    const remainingBytes = this.progress.fileSize - (this.progress.uploadedChunks * this.getAverageChunkSize());
    const remainingSeconds = Math.ceil(remainingBytes / this.progress.uploadSpeed);

    return this.formatTime(remainingSeconds);
  }

  get uploadSpeedFormatted(): string {
    return this.formatBytes(this.progress.uploadSpeed) + '/s';
  }

  get uploadedSizeFormatted(): string {
    const uploadedBytes = this.progress.uploadedChunks * this.getAverageChunkSize();
    return this.formatBytes(uploadedBytes);
  }

  get totalSizeFormatted(): string {
    return this.formatBytes(this.progress.fileSize);
  }

  private getAverageChunkSize(): number {
    return this.progress.fileSize / this.progress.totalChunks;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  onPause(): void {
    this.uploadPaused.emit();
  }

  onResume(): void {
    this.uploadResumed.emit();
  }

  onCancel(): void {
    this.uploadCancelled.emit();
  }
}
