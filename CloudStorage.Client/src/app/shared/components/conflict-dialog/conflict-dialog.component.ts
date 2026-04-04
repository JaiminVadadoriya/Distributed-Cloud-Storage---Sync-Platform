import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncConflict } from '../../../core/models/file.model';

// Removed local SyncConflict, now using interface from file.model.ts

@Component({
  selector: 'app-conflict-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-editorial-text/40 backdrop-blur-[2px]">
      <div class="bg-editorial-bg border-4 border-editorial-text p-12 w-full max-w-3xl relative overflow-hidden selection:bg-editorial-text selection:text-editorial-bg animate-in zoom-in-95 duration-500">
        <!-- Animated Grain Overlay -->
        <div class="grain-overlay pointer-events-none opacity-[0.05]"></div>
        
        <div class="relative z-10 space-y-12">
          <div class="flex items-center gap-8 border-b-2 border-editorial-text pb-8">
            <div class="w-16 h-16 border-2 border-editorial-text flex items-center justify-center text-3xl font-bold font-mono">!</div>
            <div>
              <h2 class="text-4xl font-sans font-bold tracking-tighter uppercase text-editorial-text italic">divergence_detected</h2>
              <p class="text-[10px] font-mono uppercase tracking-[0.4em] text-editorial-text/70 mt-2">FAULT_IDENTIFIER: PARALLEL_STREAM_COLLISION</p>
            </div>
          </div>

          <div class="space-y-10">
            <p class="text-[11px] font-mono uppercase tracking-[0.2em] text-editorial-text leading-relaxed max-w-xl">
              Divergent evolution detected in [{{ conflicts.length }}] entity nodes. Select the authoritative sequence to resolve the structural mismatch.
            </p>

            <div class="divide-y divide-editorial-text/10 border-y border-editorial-text/10 max-h-[50vh] overflow-y-auto pr-8 custom-scrollbar">
              @for (conflict of conflicts; track conflict.fileId) {
                <div class="py-12 space-y-10 group">
                  <div class="flex items-center gap-4">
                    <div class="w-3 h-[1px] bg-editorial-text"></div>
                    <span class="text-sm font-sans font-bold uppercase tracking-tight">{{ conflict.fileName }}</span>
                    <span class="font-mono text-[8px] opacity-40 uppercase tracking-widest ml-auto">Entity_Ref: {{ conflict.fileId.slice(0,8) }}</span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <!-- Protocol 01: Local -->
                    <button (click)="resolve(conflict.fileId, 'KeepLocal')" 
                            class="p-8 border border-editorial-text/20 hover:border-editorial-text transition-all duration-300 group/btn text-left bg-editorial-bg">
                      <div class="flex justify-between items-start mb-6">
                        <span class="text-[9px] font-mono font-bold uppercase tracking-widest opacity-30 group-hover/btn:opacity-100 transition-opacity">Protocol_01</span>
                        <div class="w-2 h-2 border border-editorial-text group-hover/btn:bg-editorial-text transition-colors"></div>
                      </div>
                      <h4 class="text-xs font-sans font-bold uppercase tracking-widest mb-4">Sequence_Local</h4>
                      
                      <div class="space-y-2 opacity-50 group-hover/btn:opacity-100 transition-opacity">
                        <div class="flex justify-between font-mono text-[9px] uppercase tracking-tighter">
                          <span>Temporal:</span>
                          <span>{{ conflict.localLastModified | date:'dd.MM.yy HH:mm:ss' }}</span>
                        </div>
                        <div class="flex justify-between font-mono text-[9px] uppercase tracking-tighter">
                          <span>Magnitude:</span>
                          <span>{{ formatSize(conflict.localSize) }}</span>
                        </div>
                      </div>
                    </button>

                    <!-- Protocol 02: Server -->
                    <button (click)="resolve(conflict.fileId, 'KeepServer')" 
                            class="p-8 border border-editorial-text/20 hover:border-editorial-text transition-all duration-300 group/btn text-left bg-editorial-bg">
                      <div class="flex justify-between items-start mb-6">
                        <span class="text-[9px] font-mono font-bold uppercase tracking-widest opacity-30 group-hover/btn:opacity-100 transition-opacity">Protocol_02</span>
                        <div class="w-2 h-2 border border-editorial-text group-hover/btn:bg-editorial-text transition-colors"></div>
                      </div>
                      <h4 class="text-xs font-sans font-bold uppercase tracking-widest mb-4">Sequence_Cloud</h4>
                      
                      <div class="space-y-2 opacity-50 group-hover/btn:opacity-100 transition-opacity">
                        <div class="flex justify-between font-mono text-[9px] uppercase tracking-tighter">
                          <span>Temporal:</span>
                          <span>{{ conflict.serverLastModified | date:'dd.MM.yy HH:mm:ss' }}</span>
                        </div>
                        <div class="flex justify-between font-mono text-[9px] uppercase tracking-tighter">
                          <span>Magnitude:</span>
                          <span>{{ formatSize(conflict.serverSize) }}</span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="pt-10 flex items-center justify-between">
            <button (click)="closed.emit()" 
                    class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/40 hover:text-editorial-text transition-colors border-b border-transparent hover:border-editorial-text pb-1">
              Abort_Resolution_Loop
            </button>
            <p class="font-mono text-[8px] uppercase tracking-widest text-editorial-text/20 italic">Authoritative_Selection_Required</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); }
  `]
})
export class ConflictDialogComponent {
  @Input() conflicts: SyncConflict[] = [];
  @Output() resolved = new EventEmitter<{ fileId: string; resolution: 'KeepLocal' | 'KeepServer' }>();
  @Output() closed = new EventEmitter<void>();

  resolve(fileId: string, resolution: 'KeepLocal' | 'KeepServer') {
    this.resolved.emit({ fileId, resolution });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
