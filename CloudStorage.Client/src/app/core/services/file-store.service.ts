import { Injectable, signal, computed, inject } from '@angular/core';
import { FileService } from './file.service';
import { FileItem } from '../models/file.model';

@Injectable({
  providedIn: 'root'
})
export class FileStoreService {
  private fileService = inject(FileService);

  // Private state signals
  private _files = signal<FileItem[]>([]);
  private _isLoading = signal<boolean>(false);
  private _selectedFileId = signal<string | null>(null);

  // Public readonly views
  readonly files = this._files.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly selectedFileId = this._selectedFileId.asReadonly();

  // Computed state
  readonly fileCount = computed(() => this._files().length);

  loadFiles() {
    this._isLoading.set(true);
    this.fileService.getFiles().subscribe({
      next: (files) => {
        this._files.set(files || []);
        this._isLoading.set(false);
      },
      error: () => this._isLoading.set(false)
    });
  }

  selectFile(id: string | null) {
    this._selectedFileId.set(id);
  }
}
