import { Component, inject, input, output, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../../core/models/base-component';
import { FileItem, FileVersion, Permission } from '../../../core/models/file.model';
import { FileService } from '../../../core/services/file.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';
import { LayoutService } from '../../../core/services/layout.service';

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
  private layoutService = inject(LayoutService);

  file = signal<FileItem | null>(null);
  versions = signal<FileVersion[]>([]);
  permissions = signal<Permission[]>([]);
  isRenaming = signal(false);
  newName = signal('');
  activeTab = signal<'info' | 'versions' | 'permissions'>('info');

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
          this.loadVersions(id);
          this.loadPermissions(id);
          this.isBusy.set(false);
        },
        error: () => this.isBusy.set(false)
      });
  }

  private loadVersions(id: string) {
    this.fileService.getFileVersions(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => this.versions.set(v));
  }

  private loadPermissions(id: string) {
    this.fileService.getFilePermissions(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(p => this.permissions.set(p));
  }

  restoreVersion(versionId: string) {
    const id = this.fileId();
    if (!id) return;
    this.layoutService.openConfirm({
      title: 'RESTORE_SEQUENCE',
      message: 'Are you sure you want to restore this version? This will become the current head.',
      danger: false,
      action: () => {
        this.fileService.restoreVersion(id, versionId).subscribe(() => {
          this.notify.success('Version restored');
          this.loadFileDetails();
          this.fileChanged.emit();
        });
      }
    });
  }

  removePermission(userId: number) {
    const id = this.fileId();
    if (!id) return;
    this.fileService.removePermission(id, userId).subscribe(() => {
      this.notify.success('Permission revoked');
      this.loadPermissions(id);
    });
  }

  startRename() {
    this.isRenaming.set(true);
    this.newName.set(this.file()?.name || '');
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
    this.fileService.downloadFile(id, this.file()?.name);
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
