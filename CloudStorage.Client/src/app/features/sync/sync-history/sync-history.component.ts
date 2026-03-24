import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { SyncEvent } from '../../../core/models/file.model';

@Component({
  selector: 'app-sync-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-12">
      <div class="pb-8 border-b border-editorial-text/20">
        <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Sync_History</h1>
        <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60 mt-2">Timeline of synchronization events</p>
      </div>

      @if (events().length === 0) {
        <div class="py-20 text-center space-y-4">
          <div class="w-16 h-16 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono">&#8644;</div>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">No_Sync_Events_Recorded</p>
          <p class="text-[9px] font-mono text-editorial-text/30">Events will appear here as files synchronize across devices</p>
        </div>
      } @else {
        <div class="space-y-0 border-l border-editorial-text/20 ml-4">
          @for (event of events(); track event.id) {
            <div class="pl-8 pb-8 relative">
              <div class="absolute -left-[5px] top-1 w-2.5 h-2.5 border border-editorial-text/30"
                [class]="event.status === 'success' ? 'bg-emerald-500/50' : event.status === 'failed' ? 'bg-rose-500/50' : 'bg-amber-500/50'"></div>
              <div class="space-y-1">
                <div class="flex items-center gap-3">
                  <span class="text-[9px] font-mono uppercase tracking-widest text-editorial-text/50">{{ event.timestamp | date:'short' }}</span>
                  <span class="px-2 py-0.5 text-[7px] font-mono uppercase tracking-widest border"
                    [class]="event.status === 'success' ? 'border-emerald-500/30 text-emerald-500' : event.status === 'failed' ? 'border-rose-500/30 text-rose-500' : 'border-amber-500/30 text-amber-500'">
                    {{ event.status }}
                  </span>
                </div>
                <div class="text-[11px] font-mono text-editorial-text">{{ event.type | uppercase }}: {{ event.fileName }}</div>
                <div class="text-[9px] font-mono text-editorial-text/40">Device: {{ event.deviceName }}</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class SyncHistoryComponent extends BaseComponent {
  events = signal<SyncEvent[]>([]);
}
