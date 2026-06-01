import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Backdrop -->
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-[60] bg-editorial-text/10 backdrop-blur-sm lg:hidden"
        animate.enter="fade-in"
        animate.leave="fade-out"
        (click)="closeSidenav.emit()"
        (keydown.escape)="closeSidenav.emit()"
        tabindex="0"
        role="button"
        aria-label="Close Navigation">
      </div>
    }

    <!-- Sidebar Container -->
    <aside 
      class="fixed lg:static inset-y-0 left-0 z-[70] w-[280px] bg-editorial-bg border-r border-editorial-text/20 flex flex-col h-full transform transition-transform duration-500 ease-editorial"
      [class.-translate-x-full]="!isOpen() && !isDesktop()"
      [class.translate-x-0]="isOpen() || isDesktop()"
      animate.enter="slide-in-left"
      animate.leave="slide-out-left">
      
      <!-- Brand / Logo Section -->
      <div class="p-8 border-b border-editorial-text/10 flex items-center gap-4">
        <div class="w-8 h-8 bg-editorial-text flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--editorial-bg)" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="space-y-0.5">
          <h2 class="text-xs font-mono font-bold uppercase tracking-[0.3em] text-editorial-text">Antigravity</h2>
          <p class="text-[8px] font-mono uppercase tracking-widest text-editorial-text/40">Secured_Vault_Node</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        <div class="px-4 mb-4">
           <span class="text-[9px] font-mono font-bold uppercase tracking-[0.4em] text-editorial-text/30">Protocol_Nexus</span>
        </div>
        
        @for (item of navItems; track item.label) {
          <a [routerLink]="item.link"
             routerLinkActive="bg-editorial-text text-editorial-bg"
             [routerLinkActiveOptions]="{exact: true}"
             (click)="closeSidenav.emit()"
             class="flex items-center gap-4 px-4 py-3 group transition-all hover:bg-editorial-text/5">
            <div class="w-1.5 h-1.5 rounded-none bg-editorial-text/20 group-hover:bg-editorial-text transition-colors"
                 [class.bg-editorial-bg]="isActive(item.link)"></div>
            <span class="font-mono text-[10px] uppercase tracking-[0.2em] font-medium">{{ item.label }}</span>
          </a>
        }
      </nav>

      <!-- System Status / Footer -->
      <div class="p-8 border-t border-editorial-text/10 bg-editorial-text/[0.02] space-y-4">
        <div class="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-editorial-text/40">
          <span>Uptime_Sequence</span>
          <span class="text-editorial-text">99.98%</span>
        </div>
        <div class="h-1 w-full bg-editorial-text/10">
          <div class="h-full bg-editorial-text w-[99%]"></div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }
    .ease-editorial { transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1); }
    
    @keyframes slide-in-left {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    @keyframes slide-out-left {
      from { transform: translateX(0); }
      to { transform: translateX(-100%); }
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `]
})
export class SidenavComponent {
  isOpen = input<boolean>(false);
  isDesktop = input<boolean>(false);
  closeSidenav = output<void>();

  navItems = [
    { label: 'Overview_Root', link: '/dashboard' },
    { label: 'Network_Logs', link: '/activity' },
    { label: 'Security_Nodes', link: '/settings/security' },
    { label: 'Identity_Profile', link: '/settings/profile' }
  ];

  isActive(link: string): boolean {
    return window.location.pathname === link;
  }
}
