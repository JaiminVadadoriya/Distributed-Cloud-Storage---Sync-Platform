import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-editorial-text/10"
         (click)="onBackdropClick()" (keydown.escape)="closed.emit()" tabindex="0">
      <div class="bg-editorial-bg border-2 border-editorial-text p-12 w-full overflow-y-auto relative z-10 rounded-none"
           [style.max-width.px]="maxWidth()"
           [style.max-height]="'90vh'"
           (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-start justify-between mb-10">
          <div>
            <h2 class="text-2xl font-bold font-sans tracking-tighter uppercase text-editorial-text">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="text-[9px] font-mono uppercase tracking-[0.2em] text-editorial-text/70 mt-2">{{ subtitle() }}</p>
            }
          </div>
          <button (click)="closed.emit()" class="p-3 border border-editorial-text/20 hover:bg-editorial-text hover:text-editorial-bg transition-none rounded-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Content Projection -->
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class ModalComponent {
  title = input<string>('');
  subtitle = input<string>('');
  maxWidth = input<number>(640);
  closeOnBackdrop = input<boolean>(true);
  closed = output<void>();

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }
}
