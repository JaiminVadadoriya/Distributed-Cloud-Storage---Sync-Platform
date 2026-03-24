import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-bulk-actions',
  imports: [CommonModule],
  templateUrl: './bulk-actions.html',
  styleUrl: './bulk-actions.css',
})
export class BulkActions extends BaseComponent {
  selectedFileIds = input<string[]>([]);
  actionCompleted = output<void>();

  private fileService = inject(FileService);
  private notify = inject(NotificationService);

  isProcessing = signal(false);

  get selectionCount(): number {
    return this.selectedFileIds()?.length || 0;
  }

  bulkDelete() {
    const ids = this.selectedFileIds();
    if (!ids.length) return;

    this.isProcessing.set(true);
    this.fileService.bulkDelete(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success(`${ids.length} files deleted`);
          this.isProcessing.set(false);
          this.actionCompleted.emit();
        },
        error: () => this.isProcessing.set(false)
      });
  }

  bulkMove(targetFolderId: string | null) {
    const ids = this.selectedFileIds();
    if (!ids.length) return;

    this.isProcessing.set(true);
    this.fileService.bulkMove(ids, targetFolderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success(`${ids.length} files moved`);
          this.isProcessing.set(false);
          this.actionCompleted.emit();
        },
        error: () => this.isProcessing.set(false)
      });
  }
}
