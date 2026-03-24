import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { UploadManagerService } from '../../../core/services/upload-manager.service';

@Component({
  selector: 'app-upload-analytics',
  imports: [CommonModule],
  templateUrl: './upload-analytics.html',
  styleUrl: './upload-analytics.css',
})
export class UploadAnalytics extends BaseComponent {
  private uploadManager = inject(UploadManagerService);

  queue = this.uploadManager.queue;

  totalUploads = computed(() => this.queue().length);
  completedUploads = computed(() => this.queue().filter(t => t.status === 'complete').length);
  failedUploads = computed(() => this.queue().filter(t => t.status === 'error').length);
  successRate = computed(() => {
    const total = this.totalUploads();
    if (total === 0) return 0;
    return Math.round((this.completedUploads() / total) * 100);
  });
  avgSpeed = computed(() => {
    const uploading = this.queue().filter(t => t.status === 'uploading');
    if (uploading.length === 0) return 0;
    return Math.round(uploading.reduce((sum, t) => sum + t.uploadSpeed, 0) / uploading.length);
  });

  formatSpeed(bps: number): string {
    if (bps <= 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
