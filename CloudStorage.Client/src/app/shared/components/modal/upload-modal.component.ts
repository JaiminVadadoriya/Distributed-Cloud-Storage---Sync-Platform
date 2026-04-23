import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../../core/services/layout.service';
import { UploadManagerService } from '../../../core/services/upload-manager.service';
import { FileUploadComponent, FileUploadEvent } from '../file-upload/file-upload.component';
import { UploadProgressComponent } from '../upload-progress/upload-progress.component';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [CommonModule, FileUploadComponent, UploadProgressComponent],
  template: `
    @if (layout.isUploadModalOpen()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-editorial-bg/80 backdrop-blur-md" 
             (click)="layout.closeUploadModal()"
             (keydown.escape)="layout.closeUploadModal()"
             tabindex="0"
             role="button"
             aria-label="Close Modal"></div>
        
        <!-- Modal Content -->
        <div class="relative w-full max-w-4xl bg-editorial-bg border-4 border-editorial-text shadow-[16px_16px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b-2 border-editorial-text p-6 bg-editorial-text text-editorial-bg">
            <div class="space-y-1">
              <h2 class="text-xs font-mono font-bold uppercase tracking-[0.5em]">Ingestion_Protocol_v2</h2>
              <p class="text-[9px] font-mono uppercase tracking-widest opacity-60">Status: {{ uploadManager.queue().length }} active_sequences | Total_Bandwidth: {{ formatSpeed(uploadManager.globalSpeed()) }}</p>
            </div>
            <button (click)="layout.closeUploadModal()" class="p-2 hover:bg-editorial-bg/10 rounded-none transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-8 space-y-12 bg-editorial-text/[0.01]">
            
            <!-- NEW UPLOAD ZONE -->
            <section class="space-y-6">
              <div class="flex items-center gap-4">
                <span class="text-[9px] font-mono font-bold uppercase tracking-widest text-editorial-text/40">01_Source_Selection</span>
                <div class="h-px flex-1 bg-editorial-text/10"></div>
              </div>
              <app-file-upload [listenToGlobal]="false" (filesSelected)="onFilesDropped($event)"></app-file-upload>
            </section>

            <!-- QUEUE STATUS -->
            @if (uploadManager.queue().length > 0) {
              <section class="space-y-6">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-4 flex-1">
                    <span class="text-[9px] font-mono font-bold uppercase tracking-widest text-editorial-text/40">02_Transmission_Queue</span>
                    <div class="h-px flex-1 bg-editorial-text/10"></div>
                  </div>
                  <button (click)="uploadManager.clearCompleted()" class="text-[9px] font-mono uppercase tracking-widest text-editorial-text/40 hover:text-editorial-text transition-colors">
                    Clear_Resolved
                  </button>
                </div>
                <div class="space-y-4">
                  @for (task of uploadManager.queue(); track task.id) {
                    <app-upload-progress [progress]="task"></app-upload-progress>
                  }
                </div>
              </section>
            } @else {
              <div class="py-24 text-center border-2 border-dashed border-editorial-text/5">
                <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/20">Awaiting_Entity_Selection</p>
              </div>
            }
          </div>

          <!-- Footer Metadata -->
          <div class="bg-editorial-text/5 border-t border-editorial-text/10 p-4 font-mono text-[8px] uppercase tracking-widest text-editorial-text/30 flex justify-between">
            <span>Security: AES-256_GCM | Node: AUTO_SCALE_CLUSTER</span>
            <span>Identity: {{ layout.isSidebarOpen() ? 'LOCAL_DISK' : 'CLOUD_STORAGE' }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    @keyframes shimmer {
      from { transform: translateX(-100%); }
      to { transform: translateX(300%); }
    }
  `]
})
export class UploadModalComponent {
  public layout = inject(LayoutService);
  public uploadManager = inject(UploadManagerService);

  onFilesDropped(events: FileUploadEvent[]) {
    events.forEach(event => {
      if (event.valid) {
        this.uploadManager.addToQueue(event.file);
      }
    });
  }

  formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let i = 0;
    while (bytesPerSecond >= 1024 && i < units.length - 1) {
      bytesPerSecond /= 1024;
      i++;
    }
    return `${bytesPerSecond.toFixed(1)} ${units[i]}`;
  }
}
