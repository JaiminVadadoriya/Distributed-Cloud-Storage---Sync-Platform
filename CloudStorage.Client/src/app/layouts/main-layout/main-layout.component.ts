import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { HeaderComponent } from '../../components/layout/header/header.component';
import { ConnectionStatusService } from '../../core/connection-status.service';
import { SyncEngineService } from '../../core/sync-engine.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen bg-surface-100 text-text-base overflow-hidden font-sans">
      <app-sidebar></app-sidebar>
      <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
        <app-header></app-header>

        <!-- Offline Banner -->
        @if (connectionStatus.isOffline()) {
          <div class="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-3 text-amber-700 dark:text-amber-300 text-sm">
            <div class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></div>
            <span class="font-medium">You're offline.</span>
            <span class="text-amber-600 dark:text-amber-400">Changes will sync when reconnected.</span>
          </div>
        }

        <!-- Syncing Indicator -->
        @if (syncEngine.isSyncing()) {
          <div class="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center gap-3 text-primary text-sm">
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="font-medium">Syncing changes...</span>
          </div>
        }

        <main class="flex-1 overflow-y-auto p-6 scroll-smooth">
           <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  connectionStatus = inject(ConnectionStatusService);
  syncEngine = inject(SyncEngineService);
}
