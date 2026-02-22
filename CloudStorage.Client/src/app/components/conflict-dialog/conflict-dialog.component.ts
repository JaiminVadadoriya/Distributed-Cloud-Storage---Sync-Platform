import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConflictInfo, SyncEngineService } from '../../core/sync-engine.service';

@Component({
  selector: 'app-conflict-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         (click)="close()" (keydown.escape)="close()" tabindex="0">
      <div class="bg-surface-100 rounded-3xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
           (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" tabindex="0">

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600 dark:text-amber-400">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold">Sync Conflicts Detected</h2>
              <p class="text-sm text-text-muted">{{ conflicts().length }} file(s) were modified both locally and on the server</p>
            </div>
          </div>
          <button (click)="close()" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Batch Actions -->
        @if (conflicts().length > 1) {
          <div class="flex gap-3 mb-6">
            <button (click)="resolveAll('KeepLocal')"
                    class="flex-1 px-4 py-2.5 rounded-xl border-2 border-primary text-primary font-medium hover:bg-primary/10 transition-colors text-sm">
              Keep All Local
            </button>
            <button (click)="resolveAll('KeepServer')"
                    class="flex-1 px-4 py-2.5 rounded-xl border-2 border-secondary text-secondary font-medium hover:bg-secondary/10 transition-colors text-sm">
              Keep All Server
            </button>
          </div>
        }

        <!-- Conflict Cards -->
        <div class="space-y-4">
          @for (conflict of conflicts(); track conflict.fileId) {
            <div class="border border-gray-200 dark:border-white/10 rounded-2xl p-4 bg-white dark:bg-white/5">
              <!-- File Info -->
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-sm truncate">{{ conflict.fileName }}</h4>
                </div>
              </div>

              <!-- Comparison Grid -->
              <div class="grid grid-cols-2 gap-3 mb-4">
                <!-- Local Version -->
                <div class="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div class="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Local Version</div>
                  <div class="text-xs text-text-muted space-y-1">
                    <div class="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span>{{ formatDate(conflict.localLastModified) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Server Version -->
                <div class="p-3 rounded-xl bg-secondary/5 border border-secondary/10">
                  <div class="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Server Version</div>
                  <div class="text-xs text-text-muted space-y-1">
                    <div class="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span>{{ formatDate(conflict.serverLastModified) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                      <span>{{ formatSize(conflict.serverSize) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button (click)="resolveOne(conflict.fileId, 'KeepLocal')"
                        class="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-content font-medium hover:bg-primary/90 transition-colors text-sm shadow-lg shadow-primary/25">
                  Keep Local
                </button>
                <button (click)="resolveOne(conflict.fileId, 'KeepServer')"
                        class="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-white font-medium hover:bg-secondary/90 transition-colors text-sm shadow-lg shadow-secondary/25">
                  Keep Server
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ConflictDialogComponent {
  private syncEngine = inject(SyncEngineService);

  conflicts = input.required<ConflictInfo[]>();
  closed = output<void>();
  resolved = output<{ fileId: string; resolution: 'KeepLocal' | 'KeepServer' }>();

  close() {
    this.closed.emit();
  }

  async resolveOne(fileId: string, resolution: 'KeepLocal' | 'KeepServer') {
    await this.syncEngine.resolveConflict(fileId, resolution);
    this.resolved.emit({ fileId, resolution });
  }

  async resolveAll(resolution: 'KeepLocal' | 'KeepServer') {
    await this.syncEngine.resolveAllConflicts(resolution);
    this.closed.emit();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
