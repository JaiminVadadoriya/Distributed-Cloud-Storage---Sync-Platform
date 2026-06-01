import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from '../../../core/models/base-component';
import { AuthService } from '../../../core/services/auth.service';
import { FileService } from '../../../core/services/file.service';
import { FolderService } from '../../../core/services/folder.service';
import { NotificationService } from '../../../core/services/notification.service';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

@Component({
  selector: 'app-share-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './share-modal.html',
  styleUrl: './share-modal.css',
})
export class ShareModal extends BaseComponent {
  fileId = input<string | null>(null);
  folderId = input<string | null>(null);
  closed = output<void>();

  private authService = inject(AuthService);
  private fileService = inject(FileService);
  private folderService = inject(FolderService);
  private notify = inject(NotificationService);

  searchQuery = signal('');
  searchResults = signal<{ id: number; username: string; email: string }[]>([]);
  selectedUser = signal<{ id: number; username: string; email: string } | null>(null);
  permission = signal<string>('Read');
  isSharing = signal(false);

  private searchSubject = new Subject<string>();

  constructor() {
    super();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => q.length >= 2 ? this.authService.searchUsers(q) : of([])),
      takeUntil(this.destroy$)
    ).subscribe(results => this.searchResults.set(results));
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  selectUser(user: { id: number; username: string; email: string }) {
    this.selectedUser.set(user);
    this.searchResults.set([]);
    this.searchQuery.set(user.email);
  }

  share() {
    const user = this.selectedUser();
    const fId = this.fileId();
    const foldId = this.folderId();
    if (!user) return;

    this.isSharing.set(true);
    
    const obs = fId 
      ? this.fileService.shareFile(fId, user.id, this.permission())
      : foldId 
        ? this.folderService.shareFolder(foldId, user.id, this.permission())
        : null;

    if (!obs) {
      this.isSharing.set(false);
      return;
    }

    obs.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success(`Entity shared with ${user.username}`);
          this.isSharing.set(false);
          this.close();
        },
        error: (err: unknown) => {
          console.error('[ShareModal] Operation failed:', err);
          this.isSharing.set(false);
        }
      });
  }

  close() {
    this.closed.emit();
  }
}
