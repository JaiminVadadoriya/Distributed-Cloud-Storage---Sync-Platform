import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../../core/models/base-component';
import { SyncEvent } from '../../../core/models/file.model';

@Component({
  selector: 'app-sync-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-5xl mx-auto py-24 px-12 animate-in fade-in duration-700 selection:bg-editorial-text selection:text-editorial-bg">
      <!-- Header -->
      <header class="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-24 pb-16 border-b-2 border-editorial-text">
        <div class="space-y-4">
          <h3 class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 italic">System_Archive</h3>
          <h1 class="text-7xl font-sans font-bold tracking-tighter text-editorial-text uppercase italic leading-none">Sync_Spectral</h1>
          <div class="flex items-center gap-6 mt-6">
             <span class="w-16 h-[1px] bg-editorial-text"></span>
             <p class="text-[10px] font-mono uppercase tracking-[0.4em] text-editorial-text/70">Temporal_Sequence: ACTIVE</p>
          </div>
        </div>
        
        <div class="flex items-center gap-6">
           <div class="px-6 py-3 border border-editorial-text/10 font-mono text-[10px] uppercase tracking-widest text-editorial-text/40">Filter: ALL_SEGMENTS</div>
        </div>
      </header>

      @if (events().length === 0) {
        <div class="py-48 text-center border-2 border-dashed border-editorial-text/5 space-y-8 group">
          <div class="w-20 h-20 border border-editorial-text/5 mx-auto flex items-center justify-center text-editorial-text/10 text-4xl font-mono group-hover:border-editorial-text/20 transition-all select-none">&#9784;</div>
          <p class="font-mono text-[11px] uppercase tracking-[0.6em] text-editorial-text/20">Null_Sequence: No_Temporal_Activity</p>
        </div>
      } @else {
        <div class="relative space-y-20">
          <!-- Vertical temporal line -->
          <div class="absolute left-6 top-0 bottom-0 w-[1px] bg-editorial-text/10"></div>

          @for (event of events(); track event.id) {
            <div class="relative pl-24 group">
              <!-- Marker -->
              <div class="absolute left-6 -translate-x-1/2 top-1.5 w-3 h-3 border-2 border-editorial-text bg-editorial-bg z-10 transition-transform group-hover:scale-150"></div>
              
              <div class="space-y-6">
                <!-- Timestamp & Status -->
                <div class="flex items-baseline gap-6">
                  <span class="font-mono text-[11px] font-bold text-editorial-text/40 group-hover:text-editorial-text transition-colors">[{{ event.timestamp | date:'HH:mm:ss:SS' }}]</span>
                  <div class="h-[1px] w-12 bg-editorial-text/5 group-hover:bg-editorial-text/20 transition-colors"></div>
                  <span class="px-3 py-1 border text-[9px] font-mono uppercase tracking-widest font-bold grayscale group-hover:grayscale-0"
                    [class]="event.status === 'success' ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5' : event.status === 'failed' ? 'border-rose-500/30 text-rose-600 bg-rose-500/5' : 'border-amber-500/30 text-amber-600 bg-amber-500/5'">
                    {{ event.status }}
                  </span>
                </div>

                <!-- Event Details -->
                <div class="space-y-4 max-w-2xl">
                  <h3 class="text-2xl font-sans font-bold uppercase tracking-tight text-editorial-text leading-none transition-all group-hover:translate-x-2">
                    {{ event.type | uppercase }}: <span class="text-editorial-text/40">{{ event.fileName }}</span>
                  </h3>
                  <div class="flex flex-wrap items-center gap-x-8 gap-y-4 font-mono text-[9px] uppercase tracking-widest text-editorial-text/30">
                    <span class="flex items-center gap-2">Node_Agent: <span class="text-editorial-text/60 italic">{{ event.deviceName }}</span></span>
                    <span class="w-1 h-1 rounded-full bg-editorial-text/10"></span>
                    <span>Segment_Binding: Verified</span>
                  </div>
                </div>
              </div>

              <!-- Hover accent -->
              <div class="absolute right-0 bottom-0 h-[1px] w-0 group-hover:w-32 bg-editorial-text transition-all duration-700"></div>
            </div>
          }
        </div>
      }

      <footer class="mt-48 pt-12 border-t border-editorial-text/10 flex justify-between items-center opacity-20 hover:opacity-100 transition-opacity duration-1000">
         <span class="font-mono text-[9px] uppercase tracking-[0.5em]">Spectral_Chain: Verified</span>
         <div class="flex gap-16">
            <span class="font-mono text-[9px] uppercase tracking-[0.5em]">Identity: Secure</span>
            <span class="font-mono text-[9px] uppercase tracking-[0.5em]">Flow: B9-7F</span>
         </div>
      </footer>
    </div>
  `
})
export class SyncHistoryComponent extends BaseComponent {
  events = signal<SyncEvent[]>([
    { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), status: 'success', type: 'upload', fileName: 'Architectural_Overlay_V3.pdf', deviceName: 'MacBook_Pro_M2' },
    { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(), status: 'success', type: 'download', fileName: 'Protocol_Sequence_Alpha.json', deviceName: 'Workstation_01' },
    { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 128).toISOString(), status: 'failed', type: 'upload', fileName: 'Identity_Seal_Exposed.log', deviceName: 'Mobile_iOS' },
    { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 500).toISOString(), status: 'success', type: 'delete', fileName: 'Segment_Old_Cluster.bak', deviceName: 'Cloud_Node_Admin' },
  ]);
}
