import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
              <video controls class="max-w-full max-h-[70vh] w-full" [src]="previewUrl()">
                Your browser does not support video playback.
              </video>
            }
            @case ('audio') {
              <div class="p-12 w-full max-w-lg">
                <audio controls class="w-full" [src]="previewUrl()"></audio>
              </div>
            }
            @case ('pdf') {
              <iframe [src]="sanitizedUrl()" class="w-full h-[70vh] border-0"></iframe>
            }
            @case ('text') {
              <div class="w-full h-[70vh] bg-editorial-text/[0.02] border-editorial-text/10 overflow-auto custom-scrollbar">
                @if (getExtension() === 'csv') {
                  <table class="w-full border-collapse font-mono text-[10px]">
                    <thead>
                      <tr class="bg-editorial-text/5">
                        @for (cell of csvRows()[0]; track $index) {
                          <th class="p-4 border border-editorial-text/10 text-left uppercase tracking-widest text-editorial-text/40 font-bold">{{ cell }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of csvRows().slice(1); track $index) {
                        <tr class="hover:bg-editorial-text/5 transition-colors">
                          @for (cell of row; track $index) {
                            <td class="p-4 border border-editorial-text/10 text-editorial-text/80">{{ cell }}</td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else if (getExtension() === 'json') {
                   <pre class="p-8 font-mono text-[11px] leading-relaxed whitespace-pre" [innerHTML]="getHighlightedCode()"></pre>
                } @else {
                  <pre class="p-8 font-mono text-[11px] text-editorial-text/80 whitespace-pre-wrap leading-relaxed" [innerHTML]="getHighlightedCode()"></pre>
                }
              </div>
            }
            @case ('document') {
              <div class="text-center space-y-6 py-16 px-8">
                <div class="w-20 h-20 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono uppercase">{{ getExtension() }}</div>
                <div class="space-y-2">
                  <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Document_Preview</p>
                  <p class="text-[9px] font-mono text-editorial-text/30">Rich preview for {{ getExtension() }} files is best viewed in dedicated software.</p>
                </div>
                <div class="flex gap-4 justify-center">
                  <button (click)="downloadFile()" class="px-8 py-3 bg-editorial-text text-editorial-bg text-[9px] font-mono uppercase tracking-widest hover:opacity-90">
                    Download_File
                  </button>
                </div>
              </div>
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
    
    .code-keyword { color: #f92672; font-weight: bold; }
    .code-string { color: #e6db74; }
    .code-comment { color: #75715e; font-style: italic; }
    .code-number { color: #ae81ff; }
    
    pre {
      tab-size: 4;
      counter-reset: line;
    }
    
    table {
      min-width: 100%;
      background: white;
    }
    
    th {
      white-space: nowrap;
      position: sticky;
      top: 0;
      background: #fdfdfd;
      z-index: 10;
    }
  `]
})
export class FilePreviewComponent extends BaseComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fileService = inject(FileService);
  private sanitizer = inject(DomSanitizer);

  file = signal<FileItem | null>(null);
  previewUrl = signal<string>('');
  textContent = signal<string>('');
  csvRows = signal<string[][]>([]); // For CSV table rendering
  private currentObjectUrl: string | null = null;

  private readonly imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'heic', 'avif'];
  private readonly videoTypes = ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv', 'flv'];
  private readonly audioTypes = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'];
  private readonly textTypes = [
    'txt', 'md', 'markdown', 'json', 'xml', 'csv', 'log', 'ts', 'js', 'html', 'css', 
    'py', 'java', 'cs', 'sql', 'yaml', 'yml', 'c', 'cpp', 'h', 'hpp', 'rs', 'go', 
    'php', 'rb', 'json', 'sh', 'bat', 'ps1', 'ini', 'conf', 'env'
  ];
  private readonly documentTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const fileId = params['id'];
      if (fileId) this.loadFile(fileId);
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.cleanupObjectUrl();
  }

  private cleanupObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }

  private loadFile(fileId: string): void {
    this.isBusy.set(true);
    this.cleanupObjectUrl();

    this.fileService.getFileById(fileId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (file) => {
        this.file.set(file);
        const type = this.getPreviewType();

        if (type === 'text') {
          this.fileService.getFileContentAsText(fileId).pipe(takeUntil(this.destroy$)).subscribe({
            next: (content) => {
              const ext = this.getExtension();
              if (ext === 'csv') {
                this.parseCsv(content);
              } else if (ext === 'json') {
                this.textContent.set(this.formatJson(content));
              } else {
                this.textContent.set(content);
              }
              this.isBusy.set(false);
            },
            error: () => {
              this.textContent.set('Error loading content.');
              this.isBusy.set(false);
            }
          });
        } else if (['image', 'video', 'audio', 'pdf'].includes(type)) {
          this.fileService.getFileBlob(fileId).pipe(takeUntil(this.destroy$)).subscribe({
            next: (blob) => {
              this.currentObjectUrl = URL.createObjectURL(blob);
              this.previewUrl.set(this.currentObjectUrl);
              this.isBusy.set(false);
            },
            error: () => {
              console.error('Error fetching file blob for preview');
              this.isBusy.set(false);
            }
          });
        } else {
          // For 'document' or 'unknown', we don't fetch content
          this.isBusy.set(false);
        }
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
    if (this.audioTypes.includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    if (this.textTypes.includes(ext)) return 'text';
    if (this.documentTypes.includes(ext)) return 'document';
    return 'unknown';
  }

  sanitizedUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl());
  }

  downloadFile(): void {
    const f = this.file();
    if (f) this.fileService.downloadFile(f.id, f.name);
  }

  private parseCsv(content: string): void {
    const lines = content.split('\n');
    const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
    this.csvRows.set(rows.filter(row => row.length > 0 && row.some(cell => cell !== '')));
  }

  private formatJson(content: string): string {
    try {
      const obj = JSON.parse(content);
      return JSON.stringify(obj, null, 2);
    } catch {
      return content;
    }
  }

  getHighlightedCode(): string {
    let code = this.textContent();
    // Simple RegEx-based highlighter for common keywords
    const keywords = [
      'import', 'export', 'class', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 
      'interface', 'type', 'enum', 'async', 'await', 'public', 'private', 'protected', 'static', 'readonly', 'new', 'this', 'throw', 'try', 'catch', 'finally',
      'def', 'class', 'from', 'as', 'with', 'yield', 'lambda', 'global', 'nonlocal', 'assert', 'del', 'pass', 'list', 'dict', 'set', 'tuple'
    ];

    // Escape HTML first
    code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Standard string highlighting
    code = code.replace(/(?<!\\)("(?:\\"|[^"])*"|'(?:\\'|[^'])*')/g, '<span class="code-string">$1</span>');

    // Standard keyword highlighting (word boundaries)
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    code = code.replace(keywordRegex, '<span class="code-keyword">$1</span>');

    // Standard number highlighting
    code = code.replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');

    // Standard comment highlighting (single line)
    code = code.replace(/(\/\/.*|#.*)/g, '<span class="code-comment">$1</span>');

    return code;
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
