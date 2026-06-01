import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { FileItem } from '../../../core/models/file.model';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-shared-with-me',
  imports: [CommonModule],
  templateUrl: './shared-with-me.html',
  styleUrl: './shared-with-me.css',
})
export class SharedWithMeComponent extends BaseComponent implements OnInit {
  private fileService = inject(FileService);

  files = signal<FileItem[]>([]);

  ngOnInit() {
    this.loadSharedFiles();
  }

  private loadSharedFiles() {
    this.isBusy.set(true);
    this.fileService.getSharedFiles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.files.set(data); this.isBusy.set(false); },
        error: () => this.isBusy.set(false)
      });
  }

  downloadFile(fileId: string, fileName: string) {
    this.fileService.downloadFile(fileId, fileName);
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
