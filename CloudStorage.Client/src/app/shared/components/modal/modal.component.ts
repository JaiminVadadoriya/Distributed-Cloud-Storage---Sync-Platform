import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  host: {
    '(window:keydown.escape)': 'onEscape()'
  },
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 overflow-hidden"
           animate.enter="animate-enter-fade"
           animate.leave="animate-leave-fade"
           (mousedown)="onBackdropClick($event)">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-editorial-text/20 backdrop-blur-sm"></div>
        
        <!-- Modal Container -->
        <div class="relative w-full max-w-2xl bg-editorial-bg border-4 border-editorial-text shadow-[20px_20px_0px_rgba(0,0,0,1)] overflow-hidden"
             animate.enter="animate-enter-pop"
             animate.leave="animate-leave-fade"
             (mousedown)="$event.stopPropagation()"
             role="dialog" [attr.aria-label]="title()">
          
          <!-- Technical Grain & Accents -->
          <div class="absolute inset-0 opacity-[0.03] grain-overlay pointer-events-none"></div>
          <div class="absolute top-0 right-0 p-4 font-mono text-[8px] uppercase tracking-widest text-editorial-text/20 select-none">
            Node_Frame: {{ frameId() }}
          </div>

          <!-- Header -->
          <div class="p-8 md:p-12 border-b-2 border-editorial-text space-y-4">
            <div class="flex justify-between items-start">
               <div class="space-y-1">
                 <h2 class="text-3xl font-sans font-bold uppercase tracking-tighter text-editorial-text leading-none italic">
                   {{ title() }}
                 </h2>
                 <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/40">Status: Secure_Capture</p>
               </div>
               <button (click)="close()" class="w-12 h-12 border-2 border-editorial-text flex items-center justify-center text-editorial-text hover:bg-editorial-text hover:text-editorial-bg transition-colors group">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="group-hover:rotate-90 transition-transform"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
               </button>
            </div>
          </div>

          <!-- Body -->
          <div class="p-8 md:p-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
             <ng-content></ng-content>
          </div>

          <!-- Footer (Optional slot) -->
          <div class="px-8 md:px-12 py-8 border-t-2 border-editorial-text bg-editorial-text/[0.02]">
             <div class="flex justify-between items-center">
                <div class="flex items-center gap-4">
                   <div class="w-2 h-2 bg-editorial-text animate-pulse"></div>
                   <span class="font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/30 italic">Observatory_Binding</span>
                </div>
                <div class="flex gap-4">
                   <ng-content select="[footer]"></ng-content>
                </div>
             </div>
          </div>

          <!-- Subtle linear progress at bottom -->
          <div class="absolute bottom-0 left-0 h-1 w-full bg-editorial-text/5 overflow-hidden">
             <div class="h-full bg-editorial-text/20 animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
    .custom-scrollbar::-webkit-scrollbar-thumb { 
      background: #1A1A1A; 
      border-radius: 0;
    }
  `]
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Protocol_Dialog');
  closed = output<void>();

  frameId = signal<string>(`M-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`);

  close() {
    this.closed.emit();
  }

  onBackdropClick(_event: MouseEvent) {
    _event.preventDefault();
    _event.stopPropagation();
    this.close();
  }

  onEscape() {
    this.close();
  }

  // Effect to handle body locking when modal is open
  constructor() {
    effect(() => {
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }
}
