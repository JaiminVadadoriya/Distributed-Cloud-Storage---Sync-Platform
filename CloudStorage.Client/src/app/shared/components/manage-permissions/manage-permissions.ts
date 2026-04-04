import { Component, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';
import { Permission } from '../../../core/models/file.model';
import { FolderService } from '../../../core/services/folder.service';

@Component({
  selector: 'app-manage-permissions',
  imports: [CommonModule],
  templateUrl: './manage-permissions.html',
  styleUrl: './manage-permissions.css',
})
export class ManagePermissions extends BaseComponent implements OnInit {
  fileId = input<string | null>(null);
  folderId = input<string | null>(null);

  private fileService = inject(FileService);
  private folderService = inject(FolderService);
  private notify = inject(NotificationService);

  permissions = signal<Permission[]>([]);

  ngOnInit() {
    this.loadPermissions();
  }

  private loadPermissions() {
    const fileId = this.fileId();
    const folderId = this.folderId();
    if (!fileId && !folderId) return;

    this.isBusy.set(true);
    const obs = fileId 
      ? this.fileService.getFilePermissions(fileId)
      : this.folderService.getFolderPermissions(folderId!);

    obs.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Permission[]) => { 
          this.permissions.set(data); 
          this.isBusy.set(false); 
        },
        error: () => this.isBusy.set(false)
      });
  }

  removeAccess(userId: number) {
    const fileId = this.fileId();
    const folderId = this.folderId();
    if (!fileId && !folderId) return;

    this.isBusy.set(true);
    const obs = fileId
      ? this.fileService.removePermission(fileId, userId)
      : this.folderService.removeFolderPermission(folderId!, userId);

    obs.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success('REVOKED: Identity_Node_Decoupled');
          this.loadPermissions();
        },
        error: () => this.isBusy.set(false)
      });
  }

  changeRole(userId: number, newRole: string) {
    const fileId = this.fileId();
    const folderId = this.folderId();
    if (!fileId && !folderId) return;

    this.isBusy.set(true);
    const obs = fileId
      ? this.fileService.updatePermission(fileId, userId, newRole)
      : this.folderService.updateFolderPermission(folderId!, userId, newRole);

    obs.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success('RECONFIGURED: Protocol_Updated');
          this.loadPermissions();
        },
        error: () => this.isBusy.set(false)
      });
  }
}
