import { Component, input, output, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-prompt-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent, FormsModule],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="title()" (closed)="cancel.emit()">
      <div class="space-y-8">
        <p class="font-mono text-[10px] uppercase tracking-[0.4em] text-editorial-text/40 italic">
          Input_Sequence_Required
        </p>

        @if (message()) {
          <p class="font-mono text-sm uppercase tracking-widest text-editorial-text/80 leading-relaxed">
            {{ message() }}
          </p>
        }

        <div class="relative group">
          <input #promptInput
                 type="text" 
                 [(ngModel)]="promptValue"
                 (keyup.enter)="onSubmit()"
                 [placeholder]="placeholder()"
                 class="w-full bg-transparent border-b-2 border-editorial-text/10 py-4 font-mono text-lg text-editorial-text focus:outline-none focus:border-editorial-text transition-all placeholder:text-editorial-text/20 uppercase tracking-widest">
          <div class="absolute bottom-0 left-0 h-[2px] bg-editorial-text w-0 group-focus-within:w-full transition-all duration-500"></div>
        </div>

        <div class="p-6 border border-editorial-text/10 bg-editorial-text/[0.02]">
           <p class="text-[9px] font-mono uppercase tracking-[0.2em] text-editorial-text/60 leading-relaxed">
             Secure Object Labeling: Standard naming convention applies. Reserved identifiers may be subject to audit.
           </p>
        </div>
      </div>

      <div footer class="flex gap-4">
        <button (click)="cancel.emit()" 
                class="px-8 py-3 border border-editorial-text/20 font-mono text-[10px] uppercase tracking-widest hover:bg-editorial-text/5 transition-all">
          Abort_Input
        </button>
        <button (click)="onSubmit()" 
                class="px-10 py-3 bg-editorial-text text-editorial-bg font-mono text-[10px] uppercase tracking-widest font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                [disabled]="!promptValue.trim()">
          Commit_Sequence
        </button>
      </div>
    </app-modal>
  `
})
export class PromptModalComponent implements AfterViewInit {
  isOpen = input<boolean>(false);
  title = input<string>('Protocol_Input');
  message = input<string>('');
  placeholder = input<string>('Enter_Value');
  initialValue = input<string>('');

  submit = output<string>();
  cancel = output<void>();

  promptValue = '';

  @ViewChild('promptInput') inputElement!: ElementRef<HTMLInputElement>;

  ngAfterViewInit() {
    if (this.isOpen()) {
      setTimeout(() => this.inputElement.nativeElement.focus(), 100);
    }
  }

  onSubmit() {
    if (this.promptValue.trim()) {
      this.submit.emit(this.promptValue.trim());
      this.promptValue = '';
    }
  }
}
