import { Component, viewChild, ElementRef, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './modal.component';
import { LayoutService, ConfirmConfig } from '../../../core/services/layout.service';
import { isObservable, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  host: { 
    'class': 'block',
    'attr.data-testid': '"confirm-modal-host"'
  },
  template: `
    @if (layoutService.confirmModal(); as config) {
        <app-modal [isOpen]="true" [title]="config.title" (closed)="layoutService.closeConfirm()">
        <div class="space-y-12">
          <p class="font-sans text-2xl font-black uppercase tracking-tighter text-editorial-text leading-[1.1] italic">
            {{ config.message }}
          </p>
          
          <div class="p-10 border-l-8 border-rose-500 bg-rose-500/[0.03] flex items-start gap-8 shadow-sm relative overflow-hidden">
            <div class="absolute inset-x-0 top-0 h-[1px] bg-rose-500/10"></div>
            <div class="absolute inset-x-0 bottom-0 h-[1px] bg-rose-500/10"></div>
            
            <div class="relative z-10 space-y-4">
               <div class="flex items-center gap-3">
                 <div class="w-2.5 h-2.5 bg-rose-500 animate-pulse"></div>
                 <span class="text-xs font-mono font-black uppercase tracking-[0.5em] text-rose-600">Critical_Warning</span>
               </div>
               <p class="text-[12px] font-mono uppercase tracking-[0.15em] text-rose-600/80 font-bold leading-relaxed max-w-xl">
                 This action is permanent and cannot be reversed by standard synchronization cycles. Node consistency may be affected.
               </p>
            </div>
          </div>
        </div>

        <div footer class="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
          <button (click)="layoutService.closeConfirm()" [disabled]="isProcessing()"
                  class="w-full sm:w-auto px-8 py-4 border-4 border-editorial-text/10 font-mono text-xs font-black uppercase tracking-[0.2em] hover:bg-editorial-text/5 transition-all active:scale-95 flex-shrink-0 disabled:opacity-30">
            Abort_Action
          </button>
          <button #confirmBtn (click)="onConfirm(config)" [disabled]="isProcessing()"
                  [class]="config.danger ? 'bg-rose-600 text-editorial-bg shadow-brutalist' : 'bg-editorial-text text-editorial-bg shadow-brutalist'"
                  class="w-full sm:w-auto px-10 py-4 font-mono text-xs font-black uppercase tracking-[0.3em] hover:opacity-90 active:scale-95 transition-all relative group overflow-hidden flex-shrink-0 disabled:opacity-50">
            <span class="relative z-10">{{ isProcessing() ? 'Executing...' : 'Confirm_Sequence' }}</span>
            <div class="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
          </button>
        </div>
      </app-modal>
    }
  `
})
export class ConfirmModalComponent {
  layoutService = inject(LayoutService);
  confirmBtn = viewChild<ElementRef<HTMLButtonElement>>('confirmBtn');
  isProcessing = signal(false);

  async onConfirm(config: ConfirmConfig) {
    if (this.isProcessing()) return;
    
    this.isProcessing.set(true);
    try {
      const result = config.action();
      if (result instanceof Promise) {
        await result;
      } else if (isObservable(result)) {
        await firstValueFrom(result);
      }
      this.layoutService.closeConfirm();
    } catch (err) {
      console.error('Confirm action failed:', err);
      // We still close the modal so it doesn't get stuck open, 
      // but the component calling us should have its own error handling.
      this.layoutService.closeConfirm();
    } finally {
      this.isProcessing.set(false);
    }
  }

  constructor() {
    effect(() => {
      const config = this.layoutService.confirmModal();
      if (config?.isOpen) {
        setTimeout(() => this.confirmBtn()?.nativeElement.focus(), 100);
      }
    });
  }
}
