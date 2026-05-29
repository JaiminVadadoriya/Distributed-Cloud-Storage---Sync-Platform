import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  host: {
    'class': 'block fixed inset-0 pointer-events-none z-[100]',
    '(window:keydown.escape)': 'onEscape()',
    'attr.data-testid': 'modal-host'
  },
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 overflow-hidden bg-editorial-text/20 backdrop-blur-sm pointer-events-auto"
           (mousedown)="onBackdropClick($event)">
          
          <!-- Modal Container -->
          <div class="relative w-full max-w-3xl bg-editorial-bg border-4 border-editorial-text shadow-brutalist overflow-hidden animate-in-up flex-shrink-0"
               (mousedown)="$event.stopPropagation()"
               role="dialog" [attr.aria-label]="title()">
            
            <!-- Technical Grain & Accents -->
            <div class="grain-wrapper">
              <div class="absolute inset-0 opacity-[0.03] grain-overlay pointer-events-none"></div>
            </div>
            <div class="absolute top-0 right-0 p-6 font-mono text-[8px] uppercase tracking-widest text-editorial-text/20 select-none">
              Node_Frame_Ref: {{ frameId() }}
            </div>
  
            <!-- Header -->
            <div class="p-12 md:p-16 border-b-4 border-editorial-text space-y-8 bg-editorial-text/[0.01]">
              <div class="flex justify-between items-start gap-10">
                 <div class="space-y-3">
                   <h2 class="text-4xl md:text-6xl font-sans font-black text-editorial-text tracking-tighter uppercase italic leading-[0.9] translate-y-2 break-words max-w-full">
                     {{ title() }}
                   </h2>
                   <div class="flex items-center gap-6 mt-4">
                      <div class="h-[1.5px] w-12 bg-editorial-text"></div>
                      <p class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 font-bold truncate">Node_Protocol: SECURE_BIND</p>
                   </div>
                 </div>
                 <button (click)="close()" 
                   class="w-16 h-16 border-4 border-editorial-text flex items-center justify-center text-editorial-text hover:bg-editorial-text hover:text-editorial-bg transition-all group active:scale-95 flex-shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="group-hover:rotate-90 transition-transform"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                 </button>
              </div>
            </div>
  
            <!-- Body -->
            <div class="p-10 md:p-16 max-h-[60vh] overflow-y-auto custom-scrollbar">
               <ng-content></ng-content>
            </div>
  
            <!-- Footer -->
            <div class="p-10 md:px-16 py-10 border-t-4 border-editorial-text bg-editorial-bg flex flex-col md:flex-col justify-between items-center gap-8 md:gap-12">
               <div class="flex gap-6 w-full md:w-auto order-1 md:order-2">
                  <ng-content select="[footer]"></ng-content>
               </div>   
               <div class="flex items-center gap-6 order-2 md:order-1 self-start md:self-auto">
                  <div class="flex gap-1.5">
                     <div class="w-2 h-2 bg-editorial-text animate-pulse"></div>
                     <div class="w-2 h-2 bg-editorial-text animate-pulse delay-75"></div>
                     <div class="w-2 h-2 bg-editorial-text animate-pulse delay-150"></div>
                  </div>
                  <span class="font-mono text-[9px] uppercase tracking-[0.3em] text-editorial-text/30 font-black">Awaiting_Instruction</span>
               </div>
            </div>
  
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
