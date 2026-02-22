import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../../core/layout.service';
import { FileService, DashboardStats } from '../../../core/file.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <!-- Mobile Overlay -->
    @if (layoutService.sidebarOpen$ | async) {
      <div (click)="closeSidebar()" (keydown.enter)="closeSidebar()" tabindex="0" class="fixed inset-0 bg-black/50 z-30 lg:hidden glass backdrop-blur-sm"></div>
    }

    <aside class="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface-100 border-r border-gray-200 dark:border-white/10 h-full flex flex-col transition-transform duration-300 lg:translate-x-0"
           [ngClass]="(layoutService.sidebarOpen$ | async) ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'">
      <div class="p-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            </div>
            <span class="font-bold text-xl tracking-tight">CloudStorage</span>
        </div>
        
        <button (click)="closeSidebar()" class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <nav class="flex-1 px-4 space-y-1 overflow-y-auto">
        <a routerLink="/dashboard" routerLinkActive="bg-primary/10 text-primary" [routerLinkActiveOptions]="{exact: true}" (click)="closeSidebar()"
           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:text-primary transition-colors"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          <span class="font-medium">Dashboard</span>
        </a>

        <a routerLink="/dashboard/files" routerLinkActive="bg-primary/10 text-primary" (click)="closeSidebar()"
           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:text-primary transition-colors"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="font-medium">My Files</span>
        </a>

        <a routerLink="/dashboard/shared" routerLinkActive="bg-primary/10 text-primary" (click)="closeSidebar()"
           class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:text-primary transition-colors"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
          <span class="font-medium">Shared</span>
        </a>
        
        <div class="pt-4 mt-4 border-t border-gray-100 dark:border-white/10">
           <a routerLink="/dashboard/settings" routerLinkActive="bg-primary/10 text-primary" (click)="closeSidebar()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:text-primary transition-colors"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.09a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            <span class="font-medium">Settings</span>
          </a>
        </div>
      </nav>

      <div class="p-4 border-t border-gray-200 dark:border-white/10 bg-surface-50">
        @if (stats$ | async; as stats) {
        <div class="bg-primary/5 rounded-xl p-4">
             <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-primary">Storage Used</span>
                <span class="text-xs text-text-muted">{{ getPercentage(stats.totalStorageBytes, stats.maxStorageBytes) }}%</span>
             </div>
             <div class="h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full" [style.width.%]="getPercentage(stats.totalStorageBytes, stats.maxStorageBytes)"></div>
             </div>
             <div class="mt-2 text-xs text-text-muted">{{ formatBytes(stats.totalStorageBytes) }} of {{ formatBytes(stats.maxStorageBytes) }}</div>
        </div>
        }
      </div>
    </aside>
  `
})
export class SidebarComponent {
  layoutService = inject(LayoutService);
  fileService = inject(FileService);
  stats$: Observable<DashboardStats> = this.fileService.getDashboardStats();

  closeSidebar() {
    this.layoutService.closeSidebar();
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getPercentage(used: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  }
}
