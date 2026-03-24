import { Component, inject, input, output, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-file-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './file-details.html',
  styleUrl: './file-details.css',
})
export class FileDetails extends BaseComponent implements OnInit, OnChanges {
  fileId = input<string | null>(null);
  closed = output<void>();
  fileChanged = output<void>();

  private fileService = inject(FileService);
  private notify = inject(NotificationService);

  file = signal<any>(null);
  isRenaming = signal(false);
  newName = signal('');

  ngOnInit() {
    this.loadFileDetails();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fileId']) {
      this.loadFileDetails();
    }
  }

  private loadFileDetails() {
    const id = this.fileId();
    if (!id) return;

    this.isBusy.set(true);
    this.fileService.getFileById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.file.set(data);
          this.isBusy.set(false);
        },
        error: () => this.isBusy.set(false)
      });
  }

  startRename() {
    this.isRenaming.set(true);
    this.newName.set(this.file()?.fileName || '');
  }

  cancelRename() {
    this.isRenaming.set(false);
  }

  confirmRename() {
    const id = this.fileId();
    if (!id || !this.newName()) return;

    this.fileService.renameFile(id, this.newName())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success('File renamed successfully');
          this.isRenaming.set(false);
          this.loadFileDetails();
          this.fileChanged.emit();
        }
      });
  }

  downloadFile() {
    const id = this.fileId();
    if (!id) return;
    this.fileService.downloadFile(id, this.file()?.fileName);
  }

  deleteFile() {
    const id = this.fileId();
    if (!id) return;

    this.fileService.deleteFile(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success('File deleted');
          this.fileChanged.emit();
          this.close();
        }
      });
  }

  close() {
    this.closed.emit();
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
