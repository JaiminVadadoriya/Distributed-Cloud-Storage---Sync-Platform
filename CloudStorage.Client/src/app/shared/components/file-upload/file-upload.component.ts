import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FileUploadEvent {
  file: File;
  valid: boolean;
  errors?: string[];
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-12">
      <button 
        type="button"
        class="relative w-full border border-editorial-text/10 p-20 text-center transition-none group cursor-pointer focus:outline-none focus:border-editorial-text"
        [ngClass]="{
          'bg-editorial-text/5 border-editorial-text/40': isDragging,
          'bg-transparent hover:bg-editorial-text/[0.02]': !isDragging
        }"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
        aria-label="Upload files">
        
        <div class="absolute inset-0 border border-editorial-text/5 m-2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity"></div>
        
        <div class="space-y-6 relative z-10">
          <div class="w-12 h-12 border border-editorial-text/10 text-editorial-text/20 flex items-center justify-center mx-auto transition-all group-hover:border-editorial-text group-hover:text-editorial-text">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          </div>

          <div class="space-y-1">
            <h3 class="text-[11px] font-mono font-bold uppercase tracking-[0.4em] text-editorial-text">Release_Objects_Here</h3>
            <p class="text-[9px] font-mono uppercase tracking-[0.2em] text-editorial-text/30">OR CLICK TO BROWSE LOCAL_HOST</p>
          </div>
        </div>

        <input 
          type="file" 
          #fileInput
          multiple
          (change)="onFileSelected($event)"
          class="hidden"
          id="file-upload-input">
      </button>

      <!-- Technical Grid Metadata -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-0 border border-editorial-text/10">
        <div class="p-8 border-b md:border-b-0 md:border-r border-editorial-text/5">
          <div class="text-editorial-text/30 text-[8px] font-mono font-bold uppercase tracking-[0.3em] mb-4 underline decoration-editorial-text/10 underline-offset-4">Max_Load_Cap</div>
          <div class="font-mono text-[10px] font-bold text-editorial-text uppercase tracking-widest">50.00 GB</div>
        </div>
        <div class="p-8 border-b md:border-b-0 md:border-r border-editorial-text/5">
           <div class="text-editorial-text/30 text-[8px] font-mono font-bold uppercase tracking-[0.3em] mb-4 underline decoration-editorial-text/10 underline-offset-4">Chunk_Sequence</div>
           <div class="font-mono text-[10px] font-bold text-editorial-text uppercase tracking-widest">5.00 MB_SEG</div>
        </div>
         <div class="p-8">
           <div class="text-editorial-text/30 text-[8px] font-mono font-bold uppercase tracking-[0.3em] mb-4 underline decoration-editorial-text/10 underline-offset-4">Protocols_Active</div>
           <div class="font-mono text-[10px] font-bold text-editorial-text uppercase tracking-widest italic">Resumable & Deduplicating</div>
        </div>
      </div>
    </div>
  `
})
export class FileUploadComponent {
  @Output() filesSelected = new EventEmitter<FileUploadEvent[]>();

  isDragging = false;
  readonly maxFileSize = 50 * 1024 * 1024 * 1024; // 50GB
  readonly allowedTypes = ['*'];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = ''; // Reset input
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private handleFiles(files: File[]): void {
    const fileEvents: FileUploadEvent[] = files.map(file => this.validateFile(file));
    this.filesSelected.emit(fileEvents);
  }

  private validateFile(file: File): FileUploadEvent {
    const errors: string[] = [];

    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum of 50GB`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    return {
      file,
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
