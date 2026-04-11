import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../../core/models/base-component';
import { FileService } from '../../../core/services/file.service';
import { FileItem } from '../../../core/models/file.model';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { takeUntil } from 'rxjs/operators';
import { formatBytes } from '../../../core/utils/format.utils';


@Component({
  selector: 'app-recent',
  standalone: true,
  imports: [CommonModule, RouterModule, SkeletonLoaderComponent],
  template: `
    <div class="space-y-12 animate-in-fade">
      <div class="pb-8 border-b border-editorial-border">
        <h1 class="text-4xl lg:text-6xl font-extrabold font-sans tracking-tighter text-editorial-text uppercase leading-none">Recent</h1>
        <div class="flex items-center gap-4 mt-6">
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Last 20 activity cycles</p>
          <div class="h-px w-8 bg-editorial-border/30"></div>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Query_Status: STABLE</p>
        </div>
      </div>

      @if (isBusy()) {
        <app-skeleton-loader variant="table" [count]="8"></app-skeleton-loader>
      } @else if (recentFiles().length === 0) {
        <div class="py-24 text-center space-y-8 bg-editorial-text/[0.01] border border-editorial-border/50">
          <div class="w-20 h-20 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/10 text-4xl font-mono">&#8635;</div>
          <div class="space-y-2">
            <h3 class="text-xl font-extrabold uppercase tracking-tight text-editorial-text/40">No_Activity_Detected</h3>
            <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/20">Cache_Status: VACANT</p>
          </div>
        </div>
      } @else {
        <div class="border border-editorial-border bg-editorial-bg shadow-sm">
          <!-- Table Header -->
          <div class="grid grid-cols-[60px_1fr_120px_150px] gap-6 px-8 py-4 bg-editorial-text/[0.02] border-b border-editorial-border">
            <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 font-bold">TYPE</div>
            <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 font-bold">IDENTIFIER</div>
            <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 font-bold">CAPACITY</div>
            <div class="text-[9px] font-mono uppercase tracking-[0.3em] text-editorial-text/40 font-bold text-right">TIMESTAMP</div>
          </div>
          
          <div class="divide-y divide-editorial-border/30">
            @for (file of recentFiles(); track file.id) {
              <a [routerLink]="['/preview', file.id]"
                class="grid grid-cols-[60px_1fr_120px_150px] gap-6 px-8 py-5 items-center hover:bg-editorial-text/[0.03] active:bg-editorial-text/5 transition-colors cursor-pointer group">
                
                <div class="flex items-center justify-start opacity-40 group-hover:opacity-100 transition-opacity">
                  @switch (getFileCategory(file)) {
                    @case ('image') { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }
                    @case ('video') { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg> }
                    @case ('code') { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> }
                    @case ('document') { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg> }
                    @default { <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
                  }
                </div>

                <div class="flex flex-col min-w-0">
                  <span class="text-[13px] font-extrabold uppercase tracking-tight text-editorial-text truncate group-hover:underline">{{ file.name }}</span>
                  <span class="text-[8px] font-mono uppercase tracking-widest text-editorial-text/30">ID: {{ file.id.substring(0, 8).toUpperCase() }}</span>
                </div>

                <div class="text-[10px] font-mono uppercase tracking-widest text-editorial-text/40">{{ formatSize(file.size) }}</div>
                
                <div class="text-[10px] font-mono uppercase tracking-widest text-editorial-text/40 text-right">
                  {{ file.modified | date:'dd.MM.yy HH:mm' }}
                </div>
              </a>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class RecentComponent extends BaseComponent implements OnInit {
  private fileService = inject(FileService);
  recentFiles = signal<FileItem[]>([]);

  ngOnInit(): void {
    this.isBusy.set(true);
    this.fileService.getFiles().pipe(takeUntil(this.destroy$)).subscribe({
      next: (files) => {
        const sorted = [...files].sort((a, b) =>
          new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime()
        ).slice(0, 20);
        this.recentFiles.set(sorted);
        this.isBusy.set(false);
      },
      error: () => this.isBusy.set(false)
    });
  }

  formatSize = formatBytes;

  getFileCategory(file: FileItem): string {
    const ext = file.type?.toLowerCase() || file.name?.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
    if (['ts', 'js', 'html', 'css', 'py', 'json', 'md'].includes(ext)) return 'code';
    if (['doc', 'docx', 'pdf', 'txt'].includes(ext)) return 'document';
    return 'unknown';
  }
}
