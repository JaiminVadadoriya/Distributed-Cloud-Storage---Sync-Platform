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
    <div class="border border-editorial-text/10 p-6 transition-all group relative bg-editorial-text/[0.01]"
         [ngClass]="{'border-rose-500/40 bg-rose-500/[0.02]': progress.status === 'error'}">
      
      <!-- Technical Backdrop Label -->
      <div class="absolute top-0 right-0 p-2 opacity-[0.03] pointer-events-none select-none">
        <span class="text-[40px] font-mono font-bold uppercase tracking-tighter">DATA_STREAM</span>
      </div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8 relative z-10">
        <div class="flex items-start gap-4 overflow-hidden">
           <div class="w-10 h-10 border border-editorial-text/10 flex items-center justify-center text-editorial-text/40 flex-shrink-0 group-hover:border-editorial-text transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
           </div>
           <div class="min-w-0 space-y-1">
             <h4 class="text-[11px] font-mono font-bold uppercase tracking-widest text-editorial-text truncate" [title]="progress.fileName">OBJ: {{ progress.fileName }}</h4>
             <div class="text-[9px] font-mono text-editorial-text/40 flex items-center gap-2 uppercase tracking-tighter">
                <span>{{ uploadedSizeFormatted }}</span>
                <span class="opacity-30">/</span>
                <span>{{ totalSizeFormatted }}</span>
                <span class="opacity-30">|</span>
                <span class="font-bold">{{ progressPercentage }}%_SYNCED</span>
             </div>
           </div>
        </div>

        <div class="px-3 py-1.5 border border-editorial-text/20 text-[8px] font-mono font-bold uppercase tracking-[0.3em] inline-block"
             [ngClass]="{
               'bg-editorial-text text-editorial-bg border-editorial-text': progress.status === 'uploading' || progress.status === 'complete',
               'text-editorial-text/40 border-editorial-text/10': progress.status === 'paused' || progress.status === 'pending',
               'bg-rose-600 text-white border-rose-600': progress.status === 'error'
             }">
          {{ progress.status }}_SEQ
        </div>
      </div>

      <!-- Progress Line (Technical) -->
      <div class="h-[2px] w-full bg-editorial-text/5 overflow-hidden mb-6 relative rounded-none">
        <div class="h-full bg-editorial-text transition-all duration-200" 
             [style.width.%]="progressPercentage"
             [ngClass]="{
               'bg-editorial-text/40': progress.status === 'paused',
               'bg-editorial-text': progress.status === 'complete',
               'bg-rose-500': progress.status === 'error'
             }"></div>
        <!-- Active Scanline pulse -->
        @if (progress.status === 'uploading') {
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-editorial-bg/40 to-transparent w-1/3 animate-[shimmer_2s_infinite]"></div>
        }
      </div>

      <!-- Details & Controls -->
      <div class="flex items-center justify-between relative z-10">
         <div class="flex items-center gap-6 font-mono text-[9px] uppercase tracking-tighter text-editorial-text/40">
            @if (progress.status === 'uploading') {
              <div class="flex items-center gap-2">
                <span class="opacity-40">Rate:</span>
                <span class="text-editorial-text">{{ uploadSpeedFormatted }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="opacity-40">ETA:</span>
                <span class="text-editorial-text">{{ estimatedTimeRemaining }}</span>
              </div>
            }
            @if (progress.status === 'error' && progress.error) {
              <div class="text-rose-600 flex items-center gap-1 font-bold">
                 CRITICAL_FAULT: {{ progress.error }}
              </div>
            }
         </div>

         <div class="flex items-center gap-1">
            @if (progress.status === 'uploading') {
              <button (click)="onPause()" 
                      class="p-2 border border-transparent hover:border-editorial-text/10 text-editorial-text/40 hover:text-editorial-text transition-all" title="Interrupt">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="3" height="16"/><rect x="15" y="4" width="3" height="16"/></svg>
              </button>
            }
            @if (progress.status === 'paused') {
              <button (click)="onResume()" 
                      class="p-2 border border-transparent hover:border-editorial-text/10 text-editorial-text/40 hover:text-editorial-text transition-all" title="Resume">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            }
            @if (progress.status !== 'complete') {
              <button (click)="onCancel()" 
                      class="p-2 border border-transparent hover:border-rose-500/20 text-editorial-text/40 hover:text-rose-600 transition-all" title="Purge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
