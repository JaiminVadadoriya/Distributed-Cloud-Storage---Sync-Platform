import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncEngineService, SyncLogEntry } from '../../../core/services/sync-engine.service';
import { OfflineCacheService, CachedFileMetadata } from '../../../core/services/offline-cache.service';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-sync-test-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border border-editorial-text/10 bg-editorial-text/[0.01] overflow-hidden selection:bg-editorial-text selection:text-editorial-bg">
      <!-- Header -->
      <div class="p-8 border-b border-editorial-text/5 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 border border-editorial-text/20 flex items-center justify-center text-editorial-text">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 16h5v5"/>
              </svg>
            </div>
            <div class="space-y-1">
              <h3 class="text-lg font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">DIAGNOSTIC: SYNC_ENGINE</h3>
              <p class="text-[9px] font-mono uppercase tracking-[0.2em] text-editorial-text/30">SIMULATE FORKED STATES & VERIFY VECTOR RECONCILIATION</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-8">
          <div class="flex flex-col items-end gap-1">
            <span class="text-[8px] font-mono tracking-[0.3em] uppercase text-editorial-text/30">System_Status</span>
            @if (syncEngine.isSyncing()) {
              <span class="flex items-center gap-2 text-[10px] font-mono text-editorial-text font-bold uppercase tracking-widest">
                <span class="w-2.5 h-2.5 rounded-none bg-editorial-text animate-pulse"></span>
                ACTIVE_STREAM
              </span>
            } @else {
              <span class="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest"
                    [class]="connectionStatus.isOnline() ? 'text-editorial-text' : 'text-rose-500'">
                <span class="w-2.5 h-2.5 rounded-none"
                      [class]="connectionStatus.isOnline() ? 'bg-editorial-text' : 'bg-rose-500 animate-pulse'"></span>
                {{ connectionStatus.isOnline() ? 'LINK_READY' : 'LINK_DOWN' }}
              </span>
            }
          </div>

          <button (click)="runSync()"
                  [disabled]="syncEngine.isSyncing() || connectionStatus.isOffline()"
                  class="px-8 py-3 bg-editorial-text text-editorial-bg text-[10px] font-mono font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-none disabled:opacity-10 disabled:grayscale rounded-none">
            RECONCILE_NOW
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-editorial-text/5">

        <!-- LEFT: Cached files list -->
        <div class="p-8">
          <div class="flex items-end justify-between mb-8 border-b border-editorial-text/5 pb-4">
            <h4 class="text-[9px] font-mono font-bold text-editorial-text/40 uppercase tracking-[0.3em]">LOCAL_STORAGE: CACHE_INDEX</h4>
            <button (click)="refreshCachedFiles()" class="text-[9px] font-mono text-editorial-text/60 hover:text-editorial-text uppercase tracking-widest underline underline-offset-4 decoration-editorial-text/10">Re-Index</button>
          </div>

          @if (cachedFiles().length === 0) {
            <div class="text-center py-16 text-editorial-text/20">
              <p class="text-[10px] font-mono uppercase tracking-[0.3em]">Null_Index: No data cached</p>
            </div>
          } @else {
            <div class="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              @for (file of cachedFiles(); track file.id) {
                <div class="flex items-center gap-6 p-6 border border-editorial-text/5 hover:border-editorial-text/20 transition-none group rounded-none"
                     [class.bg-editorial-text]="isSimulated(file.id)"
                     [class.text-editorial-bg]="isSimulated(file.id)">

                  <div class="w-10 h-10 border flex items-center justify-center flex-shrink-0 transition-none rounded-none"
                       [class.border-editorial-text/10]="!isSimulated(file.id)"
                       [class.border-editorial-bg/20]="isSimulated(file.id)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-4">
                      <span class="text-[11px] font-mono font-bold uppercase tracking-widest truncate">{{ file.fileName }}</span>
                      @if (isConflicted(file.id)) {
                        <span class="text-[8px] px-2 py-0.5 border border-rose-500 text-rose-500 font-bold uppercase tracking-widest rounded-none">FAULT_DETECTED</span>
                      } @else if (isSimulated(file.id)) {
                        <span class="text-[8px] px-2 py-0.5 border border-editorial-bg/40 text-editorial-bg font-bold uppercase tracking-widest rounded-none">FORKED_LOCAL</span>
                      }
                    </div>
                    <div class="text-[9px] font-mono uppercase tracking-tighter opacity-40 mt-1 truncate" title="{{ file.versionVector }}">
                      v_vector: {{ file.versionVector ?? 'UNDEFINED' }}
                    </div>
                  </div>

                  @if (!isConflicted(file.id)) {
                    <button (click)="simulateEdit(file)"
                            [disabled]="syncEngine.isSyncing()"
                            class="shrink-0 px-4 py-2 border text-[9px] font-mono uppercase tracking-widest transition-none disabled:opacity-20 rounded-none"
                            [class.border-editorial-text/10]="!isSimulated(file.id)"
                            [class.hover:bg-editorial-text]="!isSimulated(file.id)"
                            [class.hover:text-editorial-bg]="!isSimulated(file.id)"
                            [class.border-editorial-bg/40]="isSimulated(file.id)"
                            [class.hover:bg-editorial-bg]="isSimulated(file.id)"
                            [class.hover:text-editorial-text]="isSimulated(file.id)">
                      FORK_STATE
                    </button>
                  }
                </div>
              }
            </div>
          }

          @if (syncEngine.hasConflicts()) {
            <div class="mt-8 p-6 border border-rose-500/40 bg-rose-500/[0.02] flex items-center gap-4 rounded-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-rose-500 shrink-0">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
              <span class="text-[9px] font-mono font-bold uppercase tracking-widest text-rose-600">
                CRITICAL: {{ syncEngine.conflicts().length }} OBJECTS IN CONFLICT_STATE. RESOLUTION_REQUIRED.
              </span>
            </div>
          }
        </div>

        <!-- RIGHT: Sync log -->
        <div class="p-8 flex flex-col gap-6 bg-editorial-text/[0.015]">
          <div class="flex items-end justify-between border-b border-editorial-text/5 pb-4">
            <h4 class="text-[9px] font-mono font-bold text-editorial-text/40 uppercase tracking-[0.3em]">TELEMETRY: LIVE_LOG_SEQ</h4>
            <button (click)="clearLog()" class="text-[9px] font-mono text-editorial-text/40 hover:text-rose-600 uppercase tracking-widest">Clear_Buffer</button>
          </div>

          <div class="bg-black/95 p-8 font-mono text-[9px] h-[350px] overflow-y-auto space-y-2 flex flex-col-reverse relative border border-editorial-text/10 rounded-none">
            @if (syncEngine.syncLog().length === 0) {
              <p class="text-editorial-text/20 text-center py-20 uppercase tracking-[0.4em]">Awaiting_Telemetry_Data…</p>
            } @else {
              @for (entry of syncEngine.syncLog(); track $index) {
                <div class="flex items-start gap-4 leading-relaxed" [class]="logLevelClass(entry.level)">
                  <span class="shrink-0 opacity-30">[{{ formatLogTime(entry.timestamp) }}]</span>
                  <span class="shrink-0 font-bold">[{{ logLevelIcon(entry.level) }}]</span>
                  <span class="uppercase tracking-widest">{{ entry.message }}</span>
                </div>
              }
            }
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap gap-6 text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-editorial-text/30 border-t border-editorial-text/5 pt-6">
            <span class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-400"></span> INF_SEQ</span>
            <span class="flex items-center gap-2"><span class="w-2 h-2 bg-green-400"></span> SUC_SEQ</span>
            <span class="flex items-center gap-2"><span class="w-2 h-2 bg-amber-400"></span> WARN_FAULT</span>
            <span class="flex items-center gap-2"><span class="w-2 h-2 bg-rose-500"></span> ERR_FAULT</span>
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
  notificationService = inject(NotificationService);

  cachedFiles = signal<CachedFileMetadata[]>([]);
  simulatedFileIds = signal<Set<string>>(new Set());

  ngOnInit() {
    this.refreshCachedFiles();
  }

  async refreshCachedFiles() {
    const files = await this.offlineCache.getCachedFiles();
    this.cachedFiles.set(files);
    this.notificationService.success('Cache Index Refreshed');
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
    this.notificationService.info('Telemetry Buffer Cleared');
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
