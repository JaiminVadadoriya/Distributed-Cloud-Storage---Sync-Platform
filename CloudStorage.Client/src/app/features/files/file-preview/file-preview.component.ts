import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { FileItem } from '../../../core/models/file.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between pb-6 border-b border-editorial-text/20">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="p-3 border border-editorial-text/20 hover:bg-editorial-text hover:text-editorial-bg transition-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 class="text-xl font-mono font-bold uppercase tracking-widest text-editorial-text">{{ file()?.name || 'Loading...' }}</h1>
            <p class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/50 mt-1">Preview_Mode: {{ getPreviewType() }}</p>
          </div>
        </div>
        <button (click)="downloadFile()" class="px-6 py-3 bg-editorial-text text-editorial-bg font-mono text-[9px] uppercase tracking-[0.2em] font-bold hover:opacity-90">
          Download_File
        </button>
      </div>

      <!-- Preview Area -->
      @if (isBusy()) {
        <div class="flex items-center justify-center py-32 text-editorial-text/20">
          <span class="font-mono text-[10px] uppercase tracking-widest animate-pulse">Loading_Preview...</span>
        </div>
      } @else if (file(); as fileData) {
        <div class="border border-editorial-text/10 bg-editorial-text/[0.01] min-h-[60vh] flex items-center justify-center">
          @switch (getPreviewType()) {
            @case ('image') {
              <img [src]="previewUrl()" [alt]="fileData.name" class="max-w-full max-h-[70vh] object-contain">
            }
            @case ('video') {
              <video controls class="max-w-full max-h-[70vh]" [src]="previewUrl()">
                Your browser does not support video playback.
              </video>
            }
            @case ('pdf') {
              <iframe [src]="sanitizedUrl()" class="w-full h-[70vh] border-0"></iframe>
            }
            @case ('text') {
              <pre class="w-full p-8 font-mono text-[11px] text-editorial-text/80 overflow-auto max-h-[70vh] whitespace-pre-wrap">{{ textContent() }}</pre>
            }
            @default {
              <div class="text-center space-y-6 py-16">
                <div class="w-20 h-20 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-4xl font-mono">?</div>
                <div class="space-y-2">
                  <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Preview_Unavailable</p>
                  <p class="text-[9px] font-mono text-editorial-text/30">This file type does not support in-browser preview</p>
                </div>
                <button (click)="downloadFile()" class="px-8 py-3 border border-editorial-text/20 text-[9px] font-mono uppercase tracking-widest hover:bg-editorial-text hover:text-editorial-bg transition-none">
                  Download_Instead
                </button>
              </div>
            }
          }
        </div>

        <!-- File Info -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-0 border border-editorial-text/10">
          <div class="p-6 border-r border-editorial-text/10">
            <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 mb-1">Size</div>
            <div class="text-sm font-mono font-bold text-editorial-text">{{ formatSize(fileData.size) }}</div>
          </div>
          <div class="p-6 border-r border-editorial-text/10">
            <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 mb-1">Type</div>
            <div class="text-sm font-mono font-bold text-editorial-text uppercase">{{ getExtension() }}</div>
          </div>
          <div class="p-6 border-r border-editorial-text/10">
            <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 mb-1">Modified</div>
            <div class="text-sm font-mono font-bold text-editorial-text">{{ fileData.lastModifiedAt | date:'shortDate' }}</div>
          </div>
          <div class="p-6">
            <div class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 mb-1">Owner</div>
            <div class="text-sm font-mono font-bold text-editorial-text uppercase">{{ fileData.owner }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class FilePreviewComponent extends BaseComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fileService = inject(FileService);
  private sanitizer = inject(DomSanitizer);

  file = signal<FileItem | null>(null);
  previewUrl = signal<string>('');
  textContent = signal<string>('');

  private readonly imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
  private readonly videoTypes = ['mp4', 'webm', 'ogg', 'mov'];
  private readonly textTypes = ['txt', 'md', 'json', 'xml', 'csv', 'log', 'ts', 'js', 'html', 'css', 'py', 'java', 'cs', 'sql', 'yaml', 'yml'];

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const fileId = params['id'];
      if (fileId) this.loadFile(fileId);
    });
  }

  private loadFile(fileId: string): void {
    this.isBusy.set(true);
    this.fileService.getFileById(fileId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (file) => {
        this.file.set(file);
        this.previewUrl.set(`/api/files/${fileId}/download`);
        this.isBusy.set(false);
      },
      error: () => this.isBusy.set(false)
    });
  }

  getExtension(): string {
    const fileName = this.file()?.name;
    return fileName?.split('.').pop()?.toLowerCase() || '';
  }

  getPreviewType(): string {
    const ext = this.getExtension();
    if (this.imageTypes.includes(ext)) return 'image';
    if (this.videoTypes.includes(ext)) return 'video';
    if (ext === 'pdf') return 'pdf';
    if (this.textTypes.includes(ext)) return 'text';
    return 'unknown';
  }

  sanitizedUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl());
  }

  downloadFile(): void {
    const f = this.file();
    if (f) this.fileService.downloadFile(f.id, f.name);
  }

  goBack(): void {
    this.router.navigate(['/files']);
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
