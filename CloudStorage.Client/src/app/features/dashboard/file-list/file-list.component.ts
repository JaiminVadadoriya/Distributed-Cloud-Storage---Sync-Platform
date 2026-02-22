import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService, FileItem } from '../../../core/file.service';
import { ConnectionStatusService } from '../../../core/connection-status.service';
import { OfflineCacheService } from '../../../core/offline-cache.service';
import { SyncEngineService } from '../../../core/sync-engine.service';
import { catchError, of, tap } from 'rxjs';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
      <div class="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
        <h3 class="font-bold text-lg">Your Files</h3>
        <div class="flex gap-2">
           <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-text-muted transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
           </button>
           <button class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-primary bg-primary/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
           </button>
        </div>
      </div>
      
      <div class="divide-y divide-gray-100 dark:divide-white/5">
        @for (file of files(); track file.id) {
          <div class="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
             <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
             </div>
             
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-sm truncate">{{ file.name }}</h4>
                <div class="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                  <span>{{ formatSize(file.size) }}</span>
                  <span>•</span>
                  <span>{{ file.modified | date:'mediumDate' }}</span>
                </div>
                

              </div>
              
              <div class="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                 <button (click)="downloadFile(file, $event)"
                         class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-text-muted transition-colors" title="Download">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                 </button>
                <button (click)="deleteFile(file, $event)" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors" title="Delete">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
             </div>
          </div>
        }
        
        @if (files().length === 0) {
          <div class="p-12 text-center text-text-muted">
             <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 mx-auto mb-4 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
             </div>
             <p>No files yet. Upload one to get started!</p>
          </div>
        }
      </div>
    </div>
  `
})
export class FileListComponent implements OnInit {
  fileService = inject(FileService);
  connectionStatus = inject(ConnectionStatusService);
  offlineCache = inject(OfflineCacheService);
  syncEngine = inject(SyncEngineService);
  files = signal<FileItem[]>([]);

  ngOnInit() {
    this.loadFiles();
  }

  loadFiles() {
    if (this.connectionStatus.isOffline()) {
      // Load from cache when offline
      this.offlineCache.getCachedFiles().then(cached => {
        this.files.set(cached.map(f => ({
          id: f.id,
          name: f.fileName,
          size: f.size,
          type: f.fileName.split('.').pop() || 'unknown',
          modified: new Date(f.createdAt),
          owner: f.isShared ? 'Shared' : 'me',
          versionVector: f.versionVector,
          lastModifiedAt: f.lastModifiedAt
        })));
      });
      return;
    }

    this.fileService.getFiles().pipe(
      tap(files => {
        // Cache files for offline use
        this.offlineCache.cacheFiles(files.map(f => ({
          id: f.id,
          fileName: f.name,
          size: f.size,
          createdAt: f.modified.toISOString(),
          lastModifiedAt: f.lastModifiedAt,
          isShared: f.owner === 'Shared',
          versionVector: f.versionVector
        })));
      }),
      catchError(err => {
        console.error('Failed to load files', err);
        // Fallback to cached files
        this.offlineCache.getCachedFiles().then(cached => {
          this.files.set(cached.map(f => ({
            id: f.id,
            name: f.fileName,
            size: f.size,
            type: f.fileName.split('.').pop() || 'unknown',
            modified: new Date(f.createdAt),
            owner: f.isShared ? 'Shared' : 'me',
            versionVector: f.versionVector,
            lastModifiedAt: f.lastModifiedAt
          })));
        });
        return of([]);
      })
    ).subscribe(files => this.files.set(files));
  }

  isConflicted(fileId: string): boolean {
    return this.syncEngine.conflicts().some(c => c.fileId === fileId);
  }

  deleteFile(file: FileItem, event: Event) {
    event.stopPropagation();
    
    // Better UX: Confirm deletion before proceeding
    if (confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
      this.fileService.deleteFile(file.id).subscribe({
        next: () => {
          this.files.update(files => files.filter(f => f.id !== file.id));
        },
        error: (err) => console.error('Error deleting file', err)
      });
    }
  }

  downloadFile(file: FileItem, event: Event) {
    event.stopPropagation();
    // Delegates to the browser's native download manager via streaming fetch.
    // No bytes are buffered in JS memory, so this works for any file size.
    this.fileService.downloadFile(file.id, file.name);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
