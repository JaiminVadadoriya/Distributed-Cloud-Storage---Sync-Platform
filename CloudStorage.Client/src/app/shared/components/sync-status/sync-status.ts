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
      <div class="px-6 py-4 bg-editorial-bg border-2 border-editorial-text shadow-brutalist flex items-center gap-6 pointer-events-auto transform transition-all hover:-translate-y-2 group overflow-hidden relative">
        <div class="absolute inset-0 bg-editorial-text/[0.02] pointer-events-none group-hover:bg-editorial-text/[0.04]"></div>
        
        <div class="relative flex items-center">
          @if (isOffline()) {
            <div class="h-1 w-6 bg-rose-600 animate-pulse"></div>
          } @else if (isSyncing()) {
            <div class="h-1 w-6 bg-editorial-text animate-[shimmer_1s_infinite]"></div>
          } @else {
            <div class="h-1 w-6 bg-editorial-text/20"></div>
          }
        </div>

        <div class="flex flex-col gap-1 relative z-10">
          <span class="font-mono text-[10px] font-extrabold uppercase tracking-[0.4em] text-editorial-text leading-tight">
            {{ statusText() }}
          </span>
          @if (hasPendingOps()) {
            <div class="flex items-center gap-2 animate-in-fade">
               <div class="w-2 h-2 border border-editorial-text/20 animate-spin"></div>
               <span class="font-mono text-[7px] uppercase tracking-[0.5em] text-editorial-text/40 font-bold">
                 RESOLVING: {{ pendingOpsCount() }} OPERATIONS
               </span>
            </div>
          } @else if (!isOffline()) {
             <span class="font-mono text-[7px] uppercase tracking-[0.5em] text-editorial-text/20 font-bold">SYSTEM_STABLE</span>
          }
        </div>

        @if (hasConflicts()) {
          <div class="flex items-center gap-2 animate-in-scale relative z-10">
            <div class="h-10 w-[2px] bg-rose-500/20 mx-2"></div>
            <div class="flex items-center gap-3 px-3 py-1.5 bg-rose-600 text-editorial-bg font-mono text-[9px] font-extrabold uppercase tracking-widest shadow-sm">
              <span class="animate-pulse">CONFLICT_ALERT</span>
            </div>
          </div>
        }

        <!-- Scanning bar animation -->
        <div class="absolute top-0 left-0 w-full h-[1px] bg-editorial-text opacity-20 -translate-x-full group-hover:translate-x-full transition-transform duration-[2s] linear"></div>
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
