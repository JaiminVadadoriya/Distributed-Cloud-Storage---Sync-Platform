import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth.service';
import { LayoutService } from '../../../core/layout.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="h-16 border-b border-gray-200 dark:border-white/10 bg-surface-100/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div class="flex items-center gap-2 sm:gap-4 w-full sm:w-1/3">
        <button (click)="toggleSidebar()" class="lg:hidden p-2 -ml-1 sm:-ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-text-muted">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>  
      
        <div class="relative w-full max-w-sm group hidden sm:block">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Search files..." class="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-black focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-text-muted/70 text-sm">
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-text-muted">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </button>
        
        <div class="h-8 w-[1px] bg-gray-200 dark:bg-white/10"></div>
        
        <div class="flex items-center gap-3 pl-2">
           <div class="text-right hidden sm:block">
              @if (currentUser$ | async; as user) {
                <div class="text-sm font-semibold">{{ user.username }}</div>
              }
              <div class="text-xs text-text-muted">Pro Plan</div>
           </div>
           <button (click)="logout()" class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all transform hover:scale-105">
              @if (currentUser$ | async; as user) {
                <span>{{ user.username.charAt(0).toUpperCase() }}</span>
              }
           </button>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  authService = inject(AuthService);
  layoutService = inject(LayoutService);
  currentUser$ = this.authService.currentUser$;

  logout() {
    this.authService.logout();
  }

  toggleSidebar() {
    this.layoutService.toggleSidebar();
  }
}
