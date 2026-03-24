import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService } from '../../../core/services/file.service';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';
import { OfflineCacheService } from '../../../core/services/offline-cache.service';
import { SyncEngineService } from '../../../core/services/sync-engine.service';
import { SearchService } from '../../../core/services/search.service';
import { BaseComponent } from '../../../core/models/base-component';
import { FileItem } from '../../../core/models/file.model';
import { catchError, of, tap, takeUntil } from 'rxjs';
import { computed } from '@angular/core';

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 selection:bg-editorial-text selection:text-editorial-bg">
      <div class="flex items-end justify-between border-b border-editorial-text/20 pb-4">
        <h3 class="text-lg font-mono font-bold uppercase tracking-[1em] text-editorial-text">R O O T _ D I R E C T O R Y</h3>
        <div class="flex gap-4">
           <button (click)="viewMode.set('grid')" [class.text-editorial-text]="viewMode() === 'grid'" [class.text-editorial-text/20]="viewMode() !== 'grid'" class="hover:text-editorial-text transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
           </button>
           <button (click)="viewMode.set('list')" [class.text-editorial-text]="viewMode() === 'list'" [class.text-editorial-text/20]="viewMode() !== 'list'" class="hover:text-editorial-text transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
           </button>
        </div>
      </div>
      
      <div class="divide-y divide-editorial-text/20">
        <!-- Table Header -->
        @if (viewMode() === 'list') {
          <div class="px-4 py-3 grid grid-cols-[40px_1fr_100px_150px] gap-6 text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-editorial-text/70 border-b border-editorial-text/20">
            <div class="flex justify-center">Typ</div>
            <div class="flex-1">Entity_Name</div>
            <div class="text-right">Size</div>
            <div class="text-right">Sequence_Date</div>
          </div>
        }

        @if (isLoading()) {
          @for (i of [1,2,3,4,5]; track i) {
            <div class="px-4 py-5 grid grid-cols-[40px_1fr_100px_150px] gap-6 border-b border-editorial-text/20 animate-pulse">
               <div class="h-4 w-4 bg-editorial-text/20 mx-auto"></div>
               <div class="font-mono text-[10px] text-editorial-text/60 uppercase tracking-widest">ENUMERATING_OBJECT_{{i}}...</div>
               <div class="text-right font-mono text-[9px] text-editorial-text/20">--- KB</div>
               <div class="text-right font-mono text-[9px] text-editorial-text/20">--.--.----</div>
            </div>
          }
        } @else {
          <div [class]="containerClass()">
            @for (file of filteredFiles(); track file.id) {
              <div [class]="itemClass()" class="hover:bg-editorial-text/[0.02] border-l-2 border-transparent hover:border-editorial-text/20 transition-all group cursor-pointer relative overflow-hidden">
                 <div class="flex items-center justify-center text-editorial-text/20 group-hover:text-editorial-text transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="viewMode() === 'grid' ? 24 : 14" [attr.height]="viewMode() === 'grid' ? 24 : 14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                 </div>
               
                <div class="min-w-0">
                  <div class="flex items-center gap-3">
                    <h4 class="font-sans text-[11px] font-bold text-editorial-text truncate tracking-tight">{{ file.name }}</h4>
                    <div class="w-1.5 h-1.5 rounded-full bg-editorial-text/20 group-hover:bg-editorial-text/60 transition-none"></div>
                  </div>
                </div>
  
                 <div [class.hidden]="viewMode() === 'grid'" class="text-right font-mono text-[9px] uppercase tracking-tighter text-editorial-text/60">
                   {{ formatSize(file.size) }}
                 </div>
   
                 <div [class.hidden]="viewMode() === 'grid'" class="text-right font-mono text-[9px] uppercase tracking-tighter text-editorial-text/60">
                   {{ file.modified | date:'dd.MM.yyyy' }}
                 </div>
                 
                 <!-- Hover Actions Overlay -->
                 <div class="absolute inset-y-0 right-0 flex items-center pr-4 gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-editorial-bg via-editorial-bg to-transparent pl-12 pointer-events-none group-hover:pointer-events-auto">
                   <button (click)="downloadFile(file, $event)"
                           class="p-2 text-editorial-text/60 hover:text-editorial-text transition-colors" title="Download Sequence">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                   </button>
                  <button (click)="deleteFile(file, $event)" class="p-2 text-editorial-text/60 hover:text-rose-600 transition-colors" title="Purge Record">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                   </button>
                </div>
            </div>
          }
          </div>
        }
        
        @if (!isLoading() && filteredFiles().length === 0) {
          <div class="p-24 text-center">
             <div class="w-12 h-12 border border-editorial-text/10 mx-auto mb-8 flex items-center justify-center opacity-20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
             </div>
             <p class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/20">Null_Directory: No entities detected</p>
          </div>
        }
      </div>
    </div>
  `
})
export class FileListComponent extends BaseComponent implements OnInit {
  fileService = inject(FileService);
  connectionStatus = inject(ConnectionStatusService);
  offlineCache = inject(OfflineCacheService);
  syncEngine = inject(SyncEngineService);
  searchService = inject(SearchService);
  
  files = signal<FileItem[]>([]);
  isLoading = signal<boolean>(true);
  viewMode = signal<'list' | 'grid'>('list');

  filteredFiles = computed(() => {
    const query = this.searchService.query();
    if (!query) {
      return this.files();
    }
    return this.files().filter(f => f.name.toLowerCase().includes(query));
  });

  containerClass = computed(() => {
    return this.viewMode() === 'grid' 
      ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4'
      : '';
  });

  itemClass = computed(() => {
    return this.viewMode() === 'list'
      ? 'px-4 py-5 grid grid-cols-[40px_1fr_100px_150px] items-center gap-6'
      : 'p-6 border border-editorial-text/10 flex flex-col items-start gap-4';
  });

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
      takeUntil(this.destroy$),
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
    ).subscribe(files => {
      this.files.set(files);
      this.isLoading.set(false);
    });
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
