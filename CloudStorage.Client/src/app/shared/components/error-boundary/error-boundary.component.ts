import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="border border-rose-500/20 bg-rose-500/5 p-10 text-center space-y-6">
      <div class="w-14 h-14 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-500 text-2xl font-bold font-mono">!</div>
      <div class="space-y-2">
        <h3 class="text-sm font-mono font-bold uppercase tracking-[0.3em] text-rose-500">{{ title() }}</h3>
        <p class="text-[10px] font-mono uppercase tracking-widest text-editorial-text/60">{{ message() }}</p>
      </div>
      @if (showRetry()) {
        <button (click)="retryClicked.emit()"
          class="px-8 py-3 border border-editorial-text/30 text-[9px] font-mono uppercase tracking-widest hover:bg-editorial-text hover:text-editorial-bg transition-none">
          Retry_Operation
        </button>
      }
    </div>
  `
})
export class ErrorBoundaryComponent {
  title = input<string>('SYSTEM_FAULT');
  message = input<string>('An unexpected error occurred in this segment.');
  showRetry = input<boolean>(true);
  retryClicked = output<void>();
}
