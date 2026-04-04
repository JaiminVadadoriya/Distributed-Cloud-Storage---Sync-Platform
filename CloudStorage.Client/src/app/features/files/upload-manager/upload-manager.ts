import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { UploadManagerService, UploadTask } from '../../../core/services/upload-manager.service';

import { ErrorBoundaryComponent } from '../../../shared/components/error-boundary/error-boundary.component';

@Component({
  selector: 'app-upload-manager',
  standalone: true,
  imports: [CommonModule, ErrorBoundaryComponent],
  templateUrl: './upload-manager.html',
  styleUrl: './upload-manager.css',
})
export class UploadManager extends BaseComponent {
  private uploadManager = inject(UploadManagerService);

  queue = this.uploadManager.queue;
  globalSpeed = this.uploadManager.globalSpeed;

  activeUploads = computed(() => this.queue().filter(t => t.status === 'uploading'));
  pendingUploads = computed(() => this.queue().filter(t => t.status === 'pending'));
  completedUploads = computed(() => this.queue().filter(t => t.status === 'complete'));
  failedUploads = computed(() => this.queue().filter(t => t.status === 'error'));

  hasItems = computed(() => this.queue().length > 0);

  getProgress(task: UploadTask): number {
    if (task.totalChunks === 0) return 0;
    return Math.round((task.uploadedChunks / task.totalChunks) * 100);
  }

  getEta(task: UploadTask): string {
    if (task.uploadSpeed <= 0 || task.status !== 'uploading') return '--';
    const remaining = task.fileSize * (1 - task.uploadedChunks / task.totalChunks);
    const seconds = Math.round(remaining / task.uploadSpeed);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}m ${seconds % 60}s`;
  }

  formatSpeed(bps: number): string {
    if (bps <= 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  clearCompleted() {
    this.uploadManager.clearCompleted();
  }
}
