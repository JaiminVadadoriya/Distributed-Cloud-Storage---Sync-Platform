import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncEngineService, SyncLogEntry } from '../../core/sync-engine.service';
import { OfflineCacheService, CachedFileMetadata } from '../../core/offline-cache.service';
import { ConnectionStatusService } from '../../core/connection-status.service';

@Component({
  selector: 'app-sync-test-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-white/5 rounded-2xl border border-amber-200 dark:border-amber-500/30 overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-amber-100 dark:border-amber-500/20 flex items-center justify-between bg-amber-50 dark:bg-amber-500/10">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600 dark:text-amber-400">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 16h5v5"/>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-sm text-amber-800 dark:text-amber-200">Sync Test Panel</h3>
            <p class="text-xs text-amber-600 dark:text-amber-400">Simulate file edits and verify sync + conflict resolution</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Sync status indicator -->
          @if (syncEngine.isSyncing()) {
            <span class="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Syncing…
            </span>
          } @else {
            <span class="flex items-center gap-1.5 text-xs font-medium"
                  [class]="connectionStatus.isOnline() ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">
              <span class="w-2 h-2 rounded-full"
                    [class]="connectionStatus.isOnline() ? 'bg-green-500' : 'bg-amber-500 animate-pulse'"></span>
              {{ connectionStatus.isOnline() ? 'Online' : 'Offline' }}
            </span>
          }
          <!-- Run Sync button -->
          <button (click)="runSync()"
                  [disabled]="syncEngine.isSyncing() || connectionStatus.isOffline()"
                  class="px-3 py-1.5 rounded-lg bg-primary text-primary-content text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Run Sync
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-white/10">

        <!-- LEFT: Cached files list -->
        <div class="p-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-text-muted uppercase tracking-wider">Cached Files</h4>
            <button (click)="refreshCachedFiles()" class="text-xs text-primary hover:text-primary/80 transition-colors">Refresh</button>
          </div>

          @if (cachedFiles().length === 0) {
            <div class="text-center py-8 text-text-muted text-sm">
              <p>No files in cache.</p>
              <p class="text-xs mt-1">Upload a file and load the dashboard to populate the cache.</p>
            </div>
          } @else {
            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              @for (file of cachedFiles(); track file.id) {
                <div class="flex items-center gap-3 p-3 rounded-xl border transition-colors group"
                     [class]="isConflicted(file.id)
                       ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10'
                       : isSimulated(file.id)
                       ? 'border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10'
                       : 'border-gray-100 dark:border-white/10 bg-surface-100 hover:border-primary/30'">

                  <!-- File icon -->
                  <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>

                  <!-- File info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium truncate">{{ file.fileName }}</span>
                      @if (isConflicted(file.id)) {
                        <span class="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-semibold">⚡ Conflict</span>
                      } @else if (isSimulated(file.id)) {
                        <span class="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-semibold">✏ Edited</span>
                      }
                    </div>
                    <div class="text-xs text-text-muted truncate font-mono" title="{{ file.versionVector }}">
                      v: {{ file.versionVector ?? 'none' }}
                    </div>
                  </div>

                  <!-- Simulate Edit button -->
                  @if (!isConflicted(file.id)) {
                    <button (click)="simulateEdit(file)"
                            [disabled]="syncEngine.isSyncing()"
                            class="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors disabled:opacity-40"
                            title="Write a forked version vector to simulate a local edit">
                      Simulate Edit
                    </button>
                  }
                </div>
              }
            </div>
          }

          <!-- Conflict count summary -->
          @if (syncEngine.hasConflicts()) {
            <div class="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600 dark:text-amber-400 shrink-0">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
              <span class="text-xs font-medium text-amber-700 dark:text-amber-300">
                {{ syncEngine.conflicts().length }} conflict(s) detected — resolve them via the conflict dialog.
              </span>
            </div>
          }
        </div>

        <!-- RIGHT: Sync log -->
        <div class="p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-text-muted uppercase tracking-wider">Sync Log</h4>
            <button (click)="clearLog()" class="text-xs text-text-muted hover:text-red-500 transition-colors">Clear</button>
          </div>

          <div class="bg-gray-950/80 rounded-xl p-3 font-mono text-xs h-72 overflow-y-auto space-y-1 flex flex-col-reverse">
            @if (syncEngine.syncLog().length === 0) {
              <p class="text-gray-500 text-center py-4">No sync events yet. Hit "Run Sync" to start.</p>
            } @else {
              @for (entry of syncEngine.syncLog(); track $index) {
                <div class="flex items-start gap-2 leading-relaxed"
                     [class]="logLevelClass(entry.level)">
                  <span class="shrink-0 text-gray-600">{{ formatLogTime(entry.timestamp) }}</span>
                  <span class="shrink-0">{{ logLevelIcon(entry.level) }}</span>
                  <span>{{ entry.message }}</span>
                </div>
              }
            }
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-3 text-xs text-text-muted">
            <span class="flex items-center gap-1"><span class="text-blue-400">ℹ</span> info</span>
            <span class="flex items-center gap-1"><span class="text-green-400">✓</span> success</span>
            <span class="flex items-center gap-1"><span class="text-amber-400">⚡</span> conflict / warn</span>
            <span class="flex items-center gap-1"><span class="text-red-400">✗</span> error</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SyncTestPanelComponent implements OnInit {
  syncEngine = inject(SyncEngineService);
  offlineCache = inject(OfflineCacheService);
  connectionStatus = inject(ConnectionStatusService);

  cachedFiles = signal<CachedFileMetadata[]>([]);
  simulatedFileIds = signal<Set<string>>(new Set());

  ngOnInit() {
    this.refreshCachedFiles();
  }

  async refreshCachedFiles() {
    const files = await this.offlineCache.getCachedFiles();
    this.cachedFiles.set(files);
  }

  isConflicted(fileId: string): boolean {
    return this.syncEngine.conflicts().some(c => c.fileId === fileId);
  }

  isSimulated(fileId: string): boolean {
    return this.simulatedFileIds().has(fileId);
  }

  async simulateEdit(file: CachedFileMetadata) {
    await this.syncEngine.simulateLocalEdit(file.id, file.fileName);
    this.simulatedFileIds.update(set => new Set([...set, file.id]));
    await this.refreshCachedFiles();
  }

  async runSync() {
    await this.syncEngine.performSync();
    await this.refreshCachedFiles();
  }

  clearLog() {
    this.syncEngine.clearLog();
  }

  formatLogTime(d: Date): string {
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  logLevelClass(level: SyncLogEntry['level']): string {
    const map: Record<SyncLogEntry['level'], string> = {
      info:    'text-blue-300',
      success: 'text-green-400',
      warn:    'text-amber-400',
      error:   'text-red-400',
    };
    return map[level];
  }

  logLevelIcon(level: SyncLogEntry['level']): string {
    const map: Record<SyncLogEntry['level'], string> = {
      info: 'ℹ', success: '✓', warn: '⚡', error: '✗'
    };
    return map[level];
  }
}
