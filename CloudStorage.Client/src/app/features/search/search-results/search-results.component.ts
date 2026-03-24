import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../../core/services/file.service';
import { SearchService } from '../../../core/services/search.service';
import { BaseComponent } from '../../../core/models/base-component';
import { FileItem } from '../../../core/models/file.model';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonLoaderComponent],
  template: `
    <div class="space-y-12">
      <div class="pb-8 border-b border-editorial-text/20">
        <h1 class="text-4xl font-bold font-sans tracking-[0.5em] text-editorial-text uppercase">Search</h1>
        <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/60 mt-2">
          @if (currentQuery()) {
            Results for "{{ currentQuery() }}" — {{ results().length }} matches
          } @else {
            Enter a query to search your files
          }
        </p>
      </div>

      <!-- Filters Bar -->
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex items-center gap-2">
          <label class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Type:</label>
          <select [(ngModel)]="filterType" (ngModelChange)="applyFilters()"
            class="bg-transparent border border-editorial-text/20 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-editorial-text focus:outline-none focus:border-editorial-text">
            <option value="">All</option>
            <option value="pdf">PDF</option>
            <option value="doc">Documents</option>
            <option value="png">Images</option>
            <option value="mp4">Video</option>
            <option value="zip">Archives</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <label class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Date:</label>
          <input type="date" [(ngModel)]="filterDateFrom" (ngModelChange)="applyFilters()"
            class="bg-transparent border border-editorial-text/20 px-3 py-1.5 text-[9px] font-mono text-editorial-text focus:outline-none focus:border-editorial-text">
          <span class="text-editorial-text/30 text-[9px]">to</span>
          <input type="date" [(ngModel)]="filterDateTo" (ngModelChange)="applyFilters()"
            class="bg-transparent border border-editorial-text/20 px-3 py-1.5 text-[9px] font-mono text-editorial-text focus:outline-none focus:border-editorial-text">
        </div>

        <div class="flex items-center gap-2">
          <label class="text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">Sort:</label>
          <select [(ngModel)]="sortBy" (ngModelChange)="applyFilters()"
            class="bg-transparent border border-editorial-text/20 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-editorial-text focus:outline-none focus:border-editorial-text">
            <option value="name">Name</option>
            <option value="date">Date</option>
            <option value="size">Size</option>
          </select>
        </div>

        @if (filterType || filterDateFrom || filterDateTo) {
          <button (click)="clearFilters()" class="px-3 py-1.5 text-[8px] font-mono uppercase tracking-widest text-editorial-text/40 hover:text-editorial-text border border-editorial-text/10">
            Clear_Filters
          </button>
        }
      </div>

      @if (isBusy()) {
        <app-skeleton-loader variant="table" [count]="6"></app-skeleton-loader>
      } @else if (results().length === 0 && currentQuery()) {
        <div class="py-20 text-center space-y-4">
          <div class="w-16 h-16 border border-editorial-text/10 mx-auto flex items-center justify-center text-editorial-text/20 text-3xl font-mono">&#8709;</div>
          <p class="text-[10px] font-mono uppercase tracking-[0.3em] text-editorial-text/40">No_Results_Found</p>
          <p class="text-[9px] font-mono text-editorial-text/30">Try adjusting your search query or filters</p>
        </div>
      } @else if (results().length > 0) {
        <div class="border border-editorial-text/20 divide-y divide-editorial-text/10">
          <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-editorial-text/[0.02]">
            <div class="col-span-5 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">File_Name</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Type</div>
            <div class="col-span-2 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Size</div>
            <div class="col-span-3 text-[8px] font-mono uppercase tracking-[0.3em] text-editorial-text/50">Modified</div>
          </div>
          @for (file of results(); track file.id) {
            <div class="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-editorial-text/[0.02] transition-none cursor-pointer">
              <div class="col-span-5 text-[11px] font-mono text-editorial-text truncate">{{ file.name }}</div>
              <div class="col-span-2 text-[9px] font-mono uppercase tracking-wider text-editorial-text/50">{{ file.type }}</div>
              <div class="col-span-2 text-[9px] font-mono text-editorial-text/50">{{ formatSize(file.size) }}</div>
              <div class="col-span-3 text-[9px] font-mono text-editorial-text/50">{{ file.modified | date:'short' }}</div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class SearchResultsComponent extends BaseComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fileService = inject(FileService);
  private searchService = inject(SearchService);
  public results = signal<FileItem[]>([]);
  public currentQuery = signal<string>('');

  filterType = '';
  filterDateFrom = '';
  filterDateTo = '';
  sortBy = 'name';
  private allResults: FileItem[] = [];

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const query = params['q'];
      if (query) {
        this.currentQuery.set(query);
        this.searchService.updateQuery(query);
        this.performSearch(query);
      }
    });
  }

  private performSearch(query: string): void {
    this.isBusy.set(true);
    this.fileService.getFiles().pipe(takeUntil(this.destroy$)).subscribe(files => {
      this.allResults = files.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
      this.applyFilters();
      this.isBusy.set(false);
    });
  }

  applyFilters(): void {
    let filtered = [...this.allResults];

    if (this.filterType) {
      filtered = filtered.filter(f => f.type.toLowerCase() === this.filterType.toLowerCase());
    }
    if (this.filterDateFrom) {
      const from = new Date(this.filterDateFrom);
      filtered = filtered.filter(f => new Date(f.modified) >= from);
    }
    if (this.filterDateTo) {
      const to = new Date(this.filterDateTo);
      filtered = filtered.filter(f => new Date(f.modified) <= to);
    }

    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'date': return new Date(b.modified).getTime() - new Date(a.modified).getTime();
        case 'size': return b.size - a.size;
        default: return a.name.localeCompare(b.name);
      }
    });

    this.results.set(filtered);
  }

  clearFilters(): void {
    this.filterType = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.applyFilters();
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
