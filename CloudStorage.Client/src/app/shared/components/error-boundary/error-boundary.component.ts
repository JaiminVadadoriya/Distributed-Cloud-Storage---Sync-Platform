import { Component, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-12 border-2 border-rose-500 bg-rose-500/5 space-y-8 animate-in fade-in slide-in-from-top-4 duration-700 select-none my-8">
      <div class="flex items-center gap-6 pb-6 border-b border-rose-500/20">
        <div class="w-12 h-12 border border-rose-500 flex items-center justify-center text-rose-500 font-mono text-2xl font-bold">!</div>
        <div class="space-y-1">
          <h3 class="text-xl font-sans font-bold uppercase tracking-tight text-rose-500 italic">Critical_Fault_Intercept</h3>
          <p class="font-mono text-[9px] uppercase tracking-[0.4em] text-rose-500/60">Node execution suspended: Segment_Exposed</p>
        </div>
      </div>
      
      <div class="space-y-6">
        <p class="font-mono text-[11px] uppercase tracking-widest text-editorial-text leading-loose">
          {{ message() || 'The application kernel encountered an unhandled exception state. Local sector isolation remains active. To restore node stability, a manual reload sequence is recommended.' }}
        </p>
        
        <div class="p-4 bg-rose-500/10 border border-rose-500/20 font-mono text-[9px] text-rose-700/70 overflow-x-auto whitespace-pre-wrap">
          ERROR_ID: HEX_{{ faultId() }}
          RECORD_TS: {{ timestamp() }}
        </div>
      </div>
      
      <div class="flex gap-4">
        <button (click)="onRetry()"
                class="px-10 py-4 bg-rose-600 text-white font-mono text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-rose-700 transition-all shadow-[8px_8px_0px_rgba(0,0,0,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none">
          Attempt_Recovery
        </button>
        <button (click)="reset()"
                class="px-10 py-4 border border-rose-500 text-rose-500 font-mono text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-rose-500/10 transition-all">
          Hard_Reload
        </button>
      </div>
      
      <footer class="pt-8 border-t border-rose-500/10 flex justify-between items-center opacity-40">
         <span class="font-mono text-[8px] uppercase tracking-widest">Protocol_State: EMERGENCY</span>
         <div class="h-[1px] flex-1 bg-rose-500/20 mx-8"></div>
         <span class="font-mono text-[8px] uppercase tracking-widest text-right">Fault_Captured: [ {{ timestamp() }} ]</span>
      </footer>
    </div>
  `
})
export class ErrorBoundaryComponent {
  message = input<string | null>(null);
  retryClicked = output<void>();

  timestamp = signal<string>(new Date().toISOString());
  faultId = signal<string>(Math.random().toString(16).substring(2, 8).toUpperCase());

  onRetry() {
    this.retryClicked.emit();
  }

  reset() {
    window.location.reload();
  }
}
