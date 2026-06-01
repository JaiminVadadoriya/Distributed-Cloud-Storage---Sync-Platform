import { Component, ElementRef, ViewChild, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from './modal.component';
import { LayoutService, PromptConfig } from '../../../core/services/layout.service';

@Component({
  selector: 'app-prompt-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, FormsModule],
  host: {
    'class': 'block fixed inset-0 pointer-events-none z-[110]',
    'attr.data-testid': 'prompt-modal-host'
  },
  template: `
    @if (layoutService.promptModal(); as config) {
      <div class="block fixed inset-0 z-[100000] pointer-events-auto">
        <app-modal [isOpen]="true" [title]="config.title" (closed)="layoutService.closePrompt()">
        <div class="space-y-10">
          <div class="flex items-center justify-between px-1">
            <p class="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-editorial-text/30 italic">
              Input_Sequence_Required
            </p>
            <div class="flex gap-1">
               <div class="w-1 h-1 bg-editorial-text/20 animate-pulse"></div>
               <div class="w-1 h-1 bg-editorial-text/20 animate-pulse delay-75"></div>
            </div>
          </div>

          @if (config.message) {
            <p class="font-sans text-lg font-bold uppercase tracking-tight text-editorial-text/80 leading-snug italic px-1">
              {{ config.message }}
            </p>
          }

          <div class="relative group px-1">
            <input #promptInput
                   type="text" 
                   [(ngModel)]="promptValue"
                   (keyup.enter)="onSubmit(config)"
                   [placeholder]="config.placeholder || 'Enter_Value'"
                   class="w-full bg-transparent border-b-2 border-editorial-text/10 py-5 font-sans text-xl font-black text-editorial-text focus:outline-none focus:border-editorial-text transition-all placeholder:text-editorial-text/10 uppercase tracking-tight selection:bg-editorial-text selection:text-editorial-bg">
          </div>

          <div class="p-8 border-2 border-editorial-text/5 bg-editorial-text/[0.02] shadow-sm">
             <div class="flex items-start gap-4">
                <div class="w-1.5 h-1.5 mt-1 bg-editorial-text/20"></div>
                <p class="text-[10px] font-mono uppercase tracking-widest text-editorial-text/40 font-bold leading-relaxed">
                  Secure Object Labeling: Standard naming convention applies. Reserved identifiers may be subject to validation audit.
                </p>
             </div>
          </div>
        </div>

        <div footer class="flex gap-4 w-full md:w-auto">
          <button (click)="layoutService.closePrompt()" 
                  data-testid="prompt-abort-btn"
                  class="flex-1 md:flex-none px-8 py-4 border-2 border-editorial-text/10 font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] hover:bg-editorial-text/5 transition-all active:scale-95 flex-shrink-0">
            Abort_Input
          </button>
          <button (click)="onSubmit(config)" 
                  [disabled]="!promptValue.trim()"
                  data-testid="prompt-commit-btn"
                  class="flex-1 md:flex-none px-10 py-4 bg-editorial-text text-editorial-bg font-mono text-[11px] font-black uppercase tracking-[0.3em] hover:opacity-90 active:scale-95 transition-all shadow-brutalist relative group overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0">
            <span class="relative z-10">Commit_Sequence</span>
            <div class="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
          </button>
        </div>
      </app-modal>
     </div>
    }
  `
})
export class PromptModalComponent implements OnDestroy {
  layoutService = inject(LayoutService);
  promptValue = '';

  @ViewChild('promptInput') inputElement!: ElementRef<HTMLInputElement>;

  constructor() {
    console.log('PromptModalComponent created');
    effect(() => {
      const config = this.layoutService.promptModal();
      console.log('PromptModal signal updated:', config?.isOpen);
      if (config?.isOpen) {
        this.promptValue = config.initialValue || '';
        setTimeout(() => this.inputElement?.nativeElement.focus(), 100);
      }
    });
  }

  ngOnDestroy() {
    console.log('PromptModalComponent destroyed');
  }

  onSubmit(config: PromptConfig & { isOpen: boolean }) {
    if (this.promptValue.trim()) {
      config.action(this.promptValue.trim());
      this.layoutService.closePrompt();
      this.promptValue = '';
    }
  }
}
