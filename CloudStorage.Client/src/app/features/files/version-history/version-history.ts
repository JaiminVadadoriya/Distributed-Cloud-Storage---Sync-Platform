import { Component, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-version-history',
  imports: [CommonModule],
  templateUrl: './version-history.html',
  styleUrl: './version-history.css',
})
export class VersionHistory extends BaseComponent implements OnInit {
  fileId = input<string>('');

  private fileService = inject(FileService);
  private notify = inject(NotificationService);

  versions = signal<any[]>([]);

  ngOnInit() {
    this.loadVersions();
  }

  private loadVersions() {
    const id = this.fileId();
    if (!id) return;

    this.isBusy.set(true);
    this.fileService.getFileVersions(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.versions.set(data); this.isBusy.set(false); },
        error: () => this.isBusy.set(false)
      });
  }

  restore(versionId: string) {
    const id = this.fileId();
    if (!id) return;

    this.fileService.restoreVersion(id, versionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success('Version restored successfully');
          this.loadVersions();
        }
      });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
