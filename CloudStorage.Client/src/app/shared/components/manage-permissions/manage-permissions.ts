import { Component, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-manage-permissions',
  imports: [CommonModule],
  templateUrl: './manage-permissions.html',
  styleUrl: './manage-permissions.css',
})
export class ManagePermissions extends BaseComponent implements OnInit {
  fileId = input<string>('');

  private fileService = inject(FileService);
  private notify = inject(NotificationService);

  permissions = signal<any[]>([]);

  ngOnInit() {
    this.loadPermissions();
  }

  private loadPermissions() {
    const id = this.fileId();
    if (!id) return;

    this.isBusy.set(true);
    this.fileService.getFilePermissions(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.permissions.set(data); this.isBusy.set(false); },
        error: () => this.isBusy.set(false)
      });
  }

  removeAccess(userId: number) {
    const id = this.fileId();
    if (!id) return;

    this.fileService.removePermission(id, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success('Permission removed');
          this.loadPermissions();
        }
      });
  }

  changeRole(userId: number, newRole: string) {
    const id = this.fileId();
    if (!id) return;

    this.fileService.updatePermission(id, userId, newRole)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success('Permission updated');
          this.loadPermissions();
        }
      });
  }
}
