import { Component, EventEmitter, Output, HostListener, signal, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LayoutService } from '../../../core/services/layout.service';

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
    <!-- Global Overlay -->
    @if (isDragging()) {
      <div 
        class="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 backdrop-blur-md bg-editorial-bg/80 animate-in-fade"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)">
        
        <div class="absolute inset-0 border-[16px] border-editorial-text/5 animate-pulse pointer-events-none"></div>
        
        <div class="max-w-3xl w-full border-4 border-editorial-text p-20 text-center space-y-12 bg-editorial-bg shadow-brutalist animate-in-scale relative overflow-hidden">
          <div class="absolute inset-0 bg-editorial-text/[0.02] pointer-events-none"></div>
          
          <div class="space-y-6 relative z-10">
            <div class="w-24 h-24 border-4 border-editorial-text flex items-center justify-center mx-auto mb-8 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
            </div>
            
            <h2 class="text-5xl lg:text-7xl font-black uppercase tracking-tighter text-editorial-text leading-none italic">
              Release_Entities_Here
            </h2>
            
            <div class="flex items-center justify-center gap-6">
              <div class="h-1 w-12 bg-editorial-text/20"></div>
              <p class="font-mono text-[10px] uppercase tracking-[0.5em] text-editorial-text/40 font-bold">Inbound_Transmission_Ready</p>
              <div class="h-1 w-12 bg-editorial-text/20"></div>
            </div>
          </div>

          <!-- Progress Shimmer Placeholder -->
          <div class="h-2 w-full bg-editorial-text/5 relative overflow-hidden">
             <div class="absolute inset-0 bg-editorial-text/20 animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
      </div>
    }

    <!-- Hidden native input for programmatic trigger -->
    <input 
      type="file" 
      #fileInput
      multiple
      (change)="onFileSelected($event)"
      class="hidden"
      id="global-file-upload-input">
  `
})
export class FileUploadComponent {
  @Input() listenToGlobal = true;
  @Output() filesSelected = new EventEmitter<FileUploadEvent[]>();

  private layoutService = inject(LayoutService);
  isDragging = signal(false);
  private dragCounter = 0;

  readonly maxFileSize = 50 * 1024 * 1024 * 1024; // 50GB

  constructor() {
    // Listen for global upload trigger only if enabled
    this.layoutService.uploadTrigger$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      if (this.listenToGlobal) {
        this.triggerUpload();
      }
    });
  }

  @HostListener('window:dragenter', ['$event'])
  onWindowDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    
    // Only show the overlay if we're actually dragging files from the OS
    const isFileDrag = event.dataTransfer?.types.includes('Files');
    if (isFileDrag && event.dataTransfer?.items && event.dataTransfer.items.length > 0) {
      this.isDragging.set(true);
    }
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.isDragging.set(false);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('window:dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('window:drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    this.dragCounter = 0;

    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  triggerUpload(): void {
    const input = document.getElementById('global-file-upload-input') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private handleFiles(files: File[]): void {
    const fileEvents: FileUploadEvent[] = files.map(file => this.validateFile(file));
    this.filesSelected.emit(fileEvents);
  }

  private validateFile(file: File): FileUploadEvent {
    const errors: string[] = [];
    if (file.size > this.maxFileSize) errors.push(`File size exceeds 50GB`);
    if (file.size === 0) errors.push('File is empty');

    return {
      file,
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
