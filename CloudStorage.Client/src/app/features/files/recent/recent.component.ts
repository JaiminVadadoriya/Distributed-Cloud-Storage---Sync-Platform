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
    <div class="space-y-12">
      <div class="pb-8 border-b border-editorial-text/20">
        <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Recent</h1>
        <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60 mt-2">Last 7 cycles of file activity</p>
      </div>

      @if (isBusy()) {
        <app-skeleton-loader variant="table" [count]="8"></app-skeleton-loader>
      } @else if (recentFiles().length === 0) {
        <div class="py-20 text-center space-y-4">
          <div class="w-16 h-16 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono">&#8635;</div>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">No_Recent_Activity</p>
        </div>
      } @else {
        <div class="border border-editorial-text/20 divide-y divide-editorial-text/10">
          <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-editorial-text/[0.02]">
            <div class="col-span-5 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">File_Name</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Type</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Size</div>
            <div class="col-span-3 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Modified</div>
          </div>
          @for (file of recentFiles(); track file.id) {
            <a [routerLink]="['/preview', file.id]"
              class="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-editorial-text/[0.02] transition-none cursor-pointer">
              <div class="col-span-5 text-[11px] font-mono text-editorial-text truncate">{{ file.name }}</div>
              <div class="col-span-2 text-[9px] font-mono uppercase tracking-wider text-editorial-text/50">{{ file.type }}</div>
              <div class="col-span-2 text-[9px] font-mono text-editorial-text/50">{{ formatSize(file.size) }}</div>
              <div class="col-span-3 text-[9px] font-mono text-editorial-text/50">{{ file.modified | date:'short' }}</div>
            </a>
          }
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
}
