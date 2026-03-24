import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conflict-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-editorial-text/40 backdrop-blur-[2px]">
      <div class="bg-editorial-bg border-4 border-editorial-text p-12 w-full max-w-2xl relative overflow-hidden selection:bg-editorial-text selection:text-editorial-bg">
        <!-- Animated Grain Overlay -->
        <div class="grain-overlay pointer-events-none opacity-[0.05]"></div>
        
        <div class="relative z-10 space-y-12">
          <div class="flex items-center gap-8 border-b-2 border-editorial-text pb-8">
            <div class="w-16 h-16 border-2 border-editorial-text flex items-center justify-center text-3xl font-bold font-mono">?</div>
            <div>
              <h2 class="text-3xl font-bold font-sans tracking-tighter uppercase text-editorial-text">Conflict_Detected</h2>
              <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/70 mt-2">PARALLEL_EVOLUTION_ERROR: MULTIPLE_VERSIONS_FOUND</p>
            </div>
          </div>

          <div class="space-y-8">
            <p class="text-[11px] font-mono uppercase tracking-widest text-editorial-text leading-relaxed">
              The system has identified [{{ conflicts.length }}] synchronization conflicts. Current object state differs from the central storage array. Select resolution protocol:
            </p>

            <div class="divide-y-2 divide-editorial-text/10 border-y-2 border-editorial-text/10 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
              @for (conflict of conflicts; track conflict.fileId) {
                <div class="py-10 space-y-8">
                  <div class="flex items-center gap-4">
                    <div class="w-2 h-2 bg-editorial-text"></div>
                    <span class="text-xs font-mono font-bold uppercase tracking-widest">{{ conflict.fileName }}</span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button (click)="resolve(conflict.fileId, 'KeepLocal')" 
                            class="p-6 border-2 border-editorial-text hover:bg-editorial-text hover:text-editorial-bg transition-none group text-left">
                      <div class="text-[9px] font-mono font-bold uppercase tracking-widest mb-2 opacity-50 group-hover:opacity-100">Protocol_01</div>
                      <div class="text-[10px] font-mono font-bold uppercase tracking-widest">Keep_Local_Version</div>
                      <div class="text-[8px] font-mono uppercase tracking-tighter mt-1 opacity-70">Overwrite central array</div>
                    </button>

                    <button (click)="resolve(conflict.fileId, 'KeepServer')" 
                            class="p-6 border-2 border-editorial-text hover:bg-editorial-text hover:text-editorial-bg transition-none group text-left">
                      <div class="text-[9px] font-mono font-bold uppercase tracking-widest mb-2 opacity-50 group-hover:opacity-100">Protocol_02</div>
                      <div class="text-[10px] font-mono font-bold uppercase tracking-widest">Keep_Cloud_Version</div>
                      <div class="text-[8px] font-mono uppercase tracking-tighter mt-1 opacity-70">Discard local modifications</div>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="pt-6 border-t-2 border-editorial-text/20">
            <button (click)="closed.emit()" 
                    class="w-full py-4 text-[10px] font-mono font-bold uppercase tracking-[0.4em] text-editorial-text/50 hover:text-editorial-text transition-colors">
              Abort_Review_Session
            </button>
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
  @Input() conflicts: any[] = [];
  @Output() resolved = new EventEmitter<{ fileId: string; resolution: 'KeepLocal' | 'KeepServer' }>();
  @Output() closed = new EventEmitter<void>();

  resolve(fileId: string, resolution: 'KeepLocal' | 'KeepServer') {
    this.resolved.emit({ fileId, resolution });
  }
}
