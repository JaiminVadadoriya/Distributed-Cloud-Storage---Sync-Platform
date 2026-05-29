import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BaseComponent } from '../../../core/models/base-component';
import { NotificationToastComponent } from '../../../shared/components/notification-toast/notification-toast.component';
import { ConfirmModalComponent } from '../../../shared/components/modal/confirm-modal.component';
import { PromptModalComponent } from '../../../shared/components/modal/prompt-modal.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationToastComponent, ConfirmModalComponent, PromptModalComponent],
  template: `
    <div class="flex h-screen w-full bg-editorial-bg text-editorial-text overflow-hidden selection:bg-editorial-text selection:text-editorial-bg">

      <!-- Mobile Backdrop -->
      @if (mobileOpen()) {
        <div class="fixed inset-0 bg-black/50 z-40 lg:hidden" 
             (click)="mobileOpen.set(false)"
             (keydown.escape)="mobileOpen.set(false)"
             tabindex="0"
             role="button"
             aria-label="Close Sidebar"></div>
      }

      <!-- Admin Sidebar -->
      <aside
        [class.translate-x-0]="mobileOpen()"
        [class.-translate-x-full]="!mobileOpen()"
        class="fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-50 w-72 flex-shrink-0 bg-editorial-bg border-r-2 border-editorial-text/10 flex flex-col transition-transform duration-300 ease-in-out">

        <!-- Admin Identity Mark -->
        <div class="px-8 py-8 border-b-2 border-editorial-text/10 flex items-center gap-5">
          <div class="w-10 h-10 bg-editorial-text flex items-center justify-center text-editorial-bg font-black text-xs font-mono">ADM</div>
          <div>
            <div class="font-sans font-black uppercase tracking-tighter text-sm leading-none">Admin_Panel</div>
            <div class="font-mono text-[9px] uppercase tracking-[0.4em] text-editorial-text/30 mt-1.5">Control_Plane_v21</div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 py-8 px-4 space-y-1 overflow-y-auto">

          <!-- Overview -->
          <a routerLink="/admin" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="bg-editorial-text text-editorial-bg"
             class="flex items-center gap-4 px-5 py-3.5 text-editorial-text/50 hover:text-editorial-text hover:bg-editorial-text/5 transition-all group">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>
            <span class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold">Overview</span>
          </a>

          <!-- Section: Management -->
          <div class="pt-6 pb-2 px-5">
            <span class="font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/20">Management</span>
          </div>

          <a routerLink="/admin/users" routerLinkActive="bg-editorial-text text-editorial-bg"
             class="flex items-center gap-4 px-5 py-3.5 text-editorial-text/50 hover:text-editorial-text hover:bg-editorial-text/5 transition-all group">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <span class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold">User_Management</span>
          </a>

          <!-- Section: Monitoring -->
          <div class="pt-6 pb-2 px-5">
            <span class="font-mono text-[8px] uppercase tracking-[0.5em] text-editorial-text/20">Monitoring</span>
          </div>

          <a routerLink="/admin/health" routerLinkActive="bg-editorial-text text-editorial-bg"
             class="flex items-center gap-4 px-5 py-3.5 text-editorial-text/50 hover:text-editorial-text hover:bg-editorial-text/5 transition-all group">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            <span class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold">System_Health</span>
          </a>

          <a routerLink="/admin/audit" routerLinkActive="bg-editorial-text text-editorial-bg"
             class="flex items-center gap-4 px-5 py-3.5 text-editorial-text/50 hover:text-editorial-text hover:bg-editorial-text/5 transition-all group">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            <span class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold">Audit_Logs</span>
          </a>

          <a routerLink="/admin/metrics" routerLinkActive="bg-editorial-text text-editorial-bg"
             class="flex items-center gap-4 px-5 py-3.5 text-editorial-text/50 hover:text-editorial-text hover:bg-editorial-text/5 transition-all group">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span class="font-mono text-[11px] uppercase tracking-[0.3em] font-bold">Telemetry_Hub</span>
          </a>
        </nav>

        <!-- Bottom: Back + Status -->
        <div class="p-6 border-t-2 border-editorial-text/10 space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="font-mono text-[9px] uppercase tracking-[0.3em] text-editorial-text/40">All_Systems_Nominal</span>
          </div>
          <a routerLink="/dashboard"
             class="flex items-center gap-3 px-4 py-3 border border-editorial-text/10 text-editorial-text/50 hover:text-editorial-text hover:border-editorial-text/40 transition-all group">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            <span class="font-mono text-[10px] uppercase tracking-[0.3em] font-bold">Exit_Admin</span>
          </a>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Admin Topbar -->
        <header class="h-16 flex-shrink-0 border-b-2 border-editorial-text/10 bg-editorial-bg/80 backdrop-blur-md flex items-center justify-between px-6 md:px-10 z-30">
          <!-- Mobile menu -->
          <button class="lg:hidden p-2 text-editorial-text/50 hover:text-editorial-text transition-colors" (click)="mobileOpen.set(!mobileOpen())">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>

          <div class="flex items-center gap-8">
            <div class="hidden md:flex items-center gap-2">
              <div class="w-1.5 h-1.5 bg-editorial-text/20 animate-pulse"></div>
              <span class="font-mono text-[9px] uppercase tracking-[0.5em] text-editorial-text/30 font-bold">Admin_Control_Plane</span>
            </div>
            <div class="hidden xl:flex items-center gap-4 border-l border-editorial-text/10 pl-8">
               <div class="flex flex-col">
                  <span class="font-mono text-[7px] uppercase tracking-[0.2em] text-editorial-text/20 leading-none mb-1">Session_ID</span>
                  <span class="font-mono text-[9px] text-editorial-text uppercase tabular-nums">{{ sessionId() }}</span>
               </div>
               <div class="flex flex-col">
                  <span class="font-mono text-[7px] uppercase tracking-[0.2em] text-editorial-text/20 leading-none mb-1">Environment</span>
                  <span class="font-mono text-[9px] text-amber-500 uppercase">Production_Live</span>
               </div>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <div class="hidden sm:flex items-center gap-3 px-4 py-2 border border-editorial-text/10 bg-editorial-text/[0.02]">
              <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span class="font-mono text-[9px] uppercase tracking-[0.3em] text-editorial-text/50">Live_Monitor</span>
            </div>
            <button (click)="goBack()"
               class="flex items-center gap-2 text-editorial-text/40 hover:text-editorial-text transition-colors">
              <span class="font-mono text-[10px] uppercase tracking-[0.3em]">{{ currentUser()?.username ?? 'Admin' }}</span>
              <div class="w-7 h-7 bg-editorial-text flex items-center justify-center text-editorial-bg font-black text-[10px]">
                {{ (currentUser()?.username?.[0] ?? 'A').toUpperCase() }}
              </div>
            </button>
          </div>
        </header>

        <!-- Grain overlay -->
        <div class="grain-wrapper pointer-events-none">
          <div class="grain-overlay opacity-[0.015]"></div>
        </div>

        <!-- Scrollable Admin Content -->
        <main class="flex-1 overflow-y-auto p-6 md:p-10 bg-editorial-bg relative">
          <div class="max-w-7xl mx-auto">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <!-- Global Overlays -->
      <app-notification-toast></app-notification-toast>
      <app-confirm-modal></app-confirm-modal>
      <app-prompt-modal></app-prompt-modal>
    </div>
  `
})
export class AdminShellComponent extends BaseComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  public currentUser = this.authService.currentUser;
  public mobileOpen = signal(false);
  public sessionId = signal(`ARC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
