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
    <div class="w-full">
      <div 
        class="relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ease-in-out"
        [ngClass]="{
          'border-primary bg-primary/5': isDragging,
          'border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-white/5': !isDragging
        }"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)">
        
        <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        </div>

        <h3 class="text-lg font-bold mb-2">Drop files here or click to browse</h3>
        <p class="text-text-muted text-sm mb-8">Upload files up to 50GB</p>

        <input 
          type="file" 
          #fileInput
          multiple
          (change)="onFileSelected($event)"
          class="hidden"
          id="file-upload-input">

        <label for="file-upload-input" class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-content font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all cursor-pointer">
          Select Files
        </label>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
          <div class="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Max file size</div>
          <div class="font-bold">50 GB</div>
        </div>
        <div class="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
           <div class="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Chunk size</div>
           <div class="font-bold">5 MB</div>
        </div>
         <div class="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
           <div class="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">Features</div>
           <div class="font-bold">Resumable, Deduplicated</div>
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
