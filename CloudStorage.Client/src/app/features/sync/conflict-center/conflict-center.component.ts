import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { SyncEngineService } from '../../../core/services/sync-engine.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-conflict-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-12">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-editorial-text/20">
        <div class="space-y-2">
          <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Conflicts</h1>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60">Unresolved sync conflicts requiring manual intervention</p>
        </div>
      </div>

      @if (syncEngine.hasConflicts()) {
        <div class="border border-editorial-text/20 divide-y divide-editorial-text/10">
          @for (conflict of syncEngine.conflicts(); track conflict.fileId) {
            <div class="p-8 space-y-6 hover:bg-editorial-text/[0.02]">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-mono font-bold text-editorial-text">{{ conflict.fileName }}</div>
                  <div class="text-[9px] font-mono uppercase tracking-widest text-editorial-text/50 mt-1">Local: {{ conflict.localLastModified | date:'short' }}</div>
                </div>
                <span class="px-3 py-1 border border-amber-500/30 text-amber-500 text-[8px] font-mono uppercase tracking-widest">Unresolved</span>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 border border-editorial-text/10 space-y-2">
                  <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Local_Version</div>
                  <div class="text-[10px] font-mono text-editorial-text">Version: v{{ conflict.serverVersion || '?' }}</div>
                  <div class="text-[10px] font-mono text-editorial-text/60">Modified: {{ conflict.localLastModified | date:'short' }}</div>
                </div>
                <div class="p-4 border border-editorial-text/10 space-y-2">
                  <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Server_Version</div>
                  <div class="text-[10px] font-mono text-editorial-text">Size: {{ conflict.serverSize || 'N/A' }}</div>
                  <div class="text-[10px] font-mono text-editorial-text/60">Modified: {{ conflict.serverLastModified | date:'short' }}</div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <button (click)="resolveConflict(conflict.fileId, 'KeepLocal')"
                  class="px-6 py-2.5 bg-editorial-text text-editorial-bg text-[9px] font-mono uppercase tracking-widest hover:opacity-90">
                  Keep_Local
                </button>
                <button (click)="resolveConflict(conflict.fileId, 'KeepServer')"
                  class="px-6 py-2.5 border border-editorial-text/30 text-[9px] font-mono uppercase tracking-widest hover:bg-editorial-text/5">
                  Keep_Server
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="py-20 text-center space-y-4">
          <div class="w-16 h-16 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono">&#10003;</div>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">No_Active_Conflicts</p>
          <p class="text-[9px] font-mono text-editorial-text/30">All file versions are synchronized</p>
        </div>
      }
    </div>
  `
})
export class ConflictCenterComponent extends BaseComponent {
  syncEngine = inject(SyncEngineService);
  private notify = inject(NotificationService);

  resolveConflict(fileId: string, resolution: 'KeepLocal' | 'KeepServer'): void {
    this.syncEngine.resolveConflict(fileId, resolution);
    this.notify.success(`Conflict resolved: ${resolution}`);
  }
}
