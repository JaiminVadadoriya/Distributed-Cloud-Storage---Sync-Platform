import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncEngineService } from '../../../core/services/sync-engine.service';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      <div class="px-5 py-3 bg-editorial-bg border border-editorial-text shadow-2xl flex items-center gap-4 pointer-events-auto transform transition-transform hover:-translate-y-1">
        <div class="relative flex h-2 w-2">
          @if (isOffline()) {
            <span class="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-20"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          } @else if (isSyncing()) {
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-editorial-text opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-editorial-text"></span>
          } @else {
             <span class="relative inline-flex rounded-full h-2 w-2 bg-editorial-text/20"></span>
          }
        </div>

        <div class="flex flex-col">
          <span class="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-editorial-text leading-tight">
            {{ statusText() }}
          </span>
          @if (hasPendingOps()) {
            <span animate.enter="animate-sync-enter"
                  animate.leave="animate-sync-leave"
                  class="font-mono text-[7px] uppercase tracking-widest text-editorial-text/40">
              Queue: {{ pendingOpsCount() }} Operations
            </span>
          }
        </div>

        @if (hasConflicts()) {
          <div animate.enter="animate-sync-enter"
               animate.leave="animate-sync-leave"
               class="flex items-center gap-2">
            <div class="h-8 w-[1px] bg-editorial-text/10 mx-2"></div>
            <div class="flex items-center gap-2 px-3 py-1 bg-rose-500 text-white font-mono text-[8px] font-bold uppercase tracking-widest animate-pulse">
              Conflict_Alert
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './sync-status.css',
  styles: [`
    @keyframes sync-in {
      from { opacity: 0; transform: scale(0.95); margin-top: -10px; }
      to { opacity: 1; transform: scale(1); margin-top: 0; }
    }
    @keyframes sync-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .animate-sync-enter { animation: sync-in 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-sync-leave { animation: sync-out 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `]
})
export class SyncStatus {
  private syncEngine = inject(SyncEngineService);
  private connectionStatus = inject(ConnectionStatusService);

  isSyncing = this.syncEngine.isSyncing;
  isOffline = this.connectionStatus.isOffline;
  pendingOpsCount = this.syncEngine.pendingOpsCount;
  hasPendingOps = this.syncEngine.hasPendingOps;
  hasConflicts = this.syncEngine.hasConflicts;

  statusText = computed(() => {
    if (this.isOffline()) return 'System_Offline';
    if (this.isSyncing()) return 'Entropy_Resolution...';
    if (this.hasPendingOps()) return 'Queue_Processing';
    return 'Status_Stable';
  });
}
