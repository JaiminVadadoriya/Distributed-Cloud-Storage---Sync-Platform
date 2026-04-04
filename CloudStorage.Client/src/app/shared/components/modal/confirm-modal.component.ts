import { Component, input, output, viewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="title()" (closed)="cancel.emit()">
      <div class="space-y-6">
        <p class="font-mono text-sm uppercase tracking-widest text-editorial-text/80 leading-relaxed">
          {{ message() }}
        </p>
        
        <div class="p-6 border border-editorial-text/10 bg-editorial-text/[0.02] flex items-start gap-4">
          <div class="w-1.5 h-1.5 mt-1 bg-rose-500 animate-pulse"></div>
          <p class="text-[10px] font-mono uppercase tracking-[0.2em] text-rose-500/70">
            Warning: This action is permanent and cannot be reversed by standard synchronization cycles.
          </p>
        </div>
      </div>

      <div footer class="flex gap-4">
        <button (click)="cancel.emit()" 
                class="px-8 py-3 border border-editorial-text/20 font-mono text-[10px] uppercase tracking-widest hover:bg-editorial-text/5 transition-all">
          Abort_Action
        </button>
        <button #confirmBtn (click)="confirm.emit()" 
                [class]="danger() ? 'bg-rose-500 text-white' : 'bg-editorial-text text-editorial-bg'"
                class="px-10 py-3 font-mono text-[10px] uppercase tracking-widest font-bold hover:opacity-90 active:scale-[0.98] transition-all focus:ring-2 focus:ring-editorial-text/40 focus:ring-offset-2">
          Confirm_Sequence
        </button>
      </div>
    </app-modal>
  `
})
export class ConfirmModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('Protocol_Confirmation');
  message = input<string>('Are you sure you want to proceed with this operation?');
  danger = input<boolean>(false);

  confirm = output<void>();
  cancel = output<void>();

  confirmBtn = viewChild<ElementRef<HTMLButtonElement>>('confirmBtn');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        setTimeout(() => this.confirmBtn()?.nativeElement.focus(), 100);
      }
    });
  }
}
